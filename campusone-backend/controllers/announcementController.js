import prisma from '../prisma/client.js';
import { sendAnnouncementEmail } from '../services/emailService.js';
import { notifyMany, TYPE } from '../services/notificationService.js';
import { auditLog } from '../utils/auditLogger.js';

/**
 * Send announcement (Admin)
 * Can filter by: all, teachers, students, specific_course
 */
export const sendAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, targetAudience } = req.body;
    const userId = req.user.id;

    // Validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'medium',
        createdBy: userId,
        targetAudience
      }
    });

    // Get recipients based on targetAudience
    let recipients = [];

    if (targetAudience === 'all') {
      // All users (admins, teachers, students)
      recipients = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, email: true, name: true }
      });
    } else if (targetAudience === 'teachers') {
      // All teachers and admins
      recipients = await prisma.user.findMany({
        where: {
          role: { in: ['teacher', 'admin'] },
          isActive: true
        },
        select: { id: true, email: true, name: true }
      });
    } else if (targetAudience === 'students') {
      // All students
      recipients = await prisma.user.findMany({
        where: {
          role: 'student',
          isActive: true
        },
        select: { id: true, email: true, name: true }
      });
    }

    // In-app notification (instant — single bulk insert)
    if (recipients.length > 0) {
      notifyMany({
        userIds: recipients.map((r) => r.id),
        type: TYPE.ANNOUNCEMENT,
        title: `📢 ${title}`,
        body: content.length > 200 ? content.slice(0, 200) + '…' : content,
        linkUrl: '/announcements',
        metadata: { announcementId: announcement.id, priority },
      });
    }

    // Send emails in background, throttled to stay under Resend's 2 req/s limit
    if (recipients.length > 0) {
      (async () => {
        for (const recipient of recipients) {
          await sendAnnouncementEmail({
            email: recipient.email,
            name: recipient.name,
            title,
            content,
            priority
          }).catch(err => console.error(`Failed to send email to ${recipient.email}:`, err));
          await new Promise(resolve => setTimeout(resolve, 550));
        }
      })();
    }

    auditLog({
      action: 'SEND_ANNOUNCEMENT', category: 'ANNOUNCEMENT',
      performedBy: req.user.id, performedByRole: req.user.role,
      targetModel: 'Announcement', targetId: announcement.id,
      description: `Sent announcement "${title}" to ${targetAudience} (${recipients.length} recipients)`,
      newValue: { title, priority, targetAudience, recipientCount: recipients.length },
    });

    res.status(201).json({
      message: `Announcement sent to ${recipients.length} recipients`,
      announcement,
      recipientCount: recipients.length
    });
  } catch (error) {
    console.error('Error sending announcement:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Send announcement to a single course offering's enrolled students (Teacher / Admin)
 * Body: { title, content, priority, offeringId }
 */
export const sendCourseAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, offeringId } = req.body;
    const userId = req.user.id;

    if (!title || !content || !offeringId) {
      return res.status(400).json({ error: 'title, content, offeringId are required' });
    }

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: { course: { select: { code: true, title: true } } },
    });
    if (!offering) return res.status(404).json({ error: 'Offering not found' });

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      if (!teacher || offering.teacherId !== teacher.id) {
        return res.status(403).json({ error: 'Not your offering' });
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'medium',
        createdBy: userId,
        targetAudience: 'course',
        offeringId,
      },
    });

    // Enrolled students of this offering
    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId, status: 'ENROLLED' },
      include: { student: { select: { userId: true, user: { select: { email: true, name: true } } } } },
    });
    const recipients = enrollments.map((e) => ({
      id: e.student.userId,
      email: e.student.user.email,
      name: e.student.user.name,
    }));

    if (recipients.length > 0) {
      notifyMany({
        userIds: recipients.map((r) => r.id),
        type: TYPE.ANNOUNCEMENT,
        title: `📢 ${offering.course.code}: ${title}`,
        body: content.length > 200 ? content.slice(0, 200) + '…' : content,
        linkUrl: '/student/notification',
        metadata: { announcementId: announcement.id, offeringId, priority },
      });

      (async () => {
        for (const r of recipients) {
          await sendAnnouncementEmail({
            email: r.email,
            name: r.name,
            title: `${offering.course.code}: ${title}`,
            content,
            priority: priority || 'medium',
          }).catch((err) => console.error(`Failed to email ${r.email}:`, err));
          await new Promise((resolve) => setTimeout(resolve, 550));
        }
      })();
    }

    auditLog({
      action: 'SEND_COURSE_ANNOUNCEMENT', category: 'ANNOUNCEMENT',
      performedBy: userId, performedByRole: req.user.role,
      targetModel: 'Announcement', targetId: announcement.id,
      description: `Sent course announcement "${title}" to ${offering.course.code} (${recipients.length} students)`,
      newValue: { title, priority, offeringId, recipientCount: recipients.length },
    });

    res.status(201).json({
      message: `Announcement sent to ${recipients.length} students`,
      announcement,
      recipientCount: recipients.length,
    });
  } catch (error) {
    console.error('Error sending course announcement:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all announcements
 */
export const getAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Enrich with creator info
    const enrichedAnnouncements = await Promise.all(
      announcements.map(async (ann) => {
        const creator = await prisma.user.findUnique({
          where: { id: ann.createdBy },
          select: { name: true, email: true, role: true }
        });
        return {
          ...ann,
          createdBy: creator
        };
      })
    );

    res.status(200).json(enrichedAnnouncements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get announcements for current user
 */
export const getMyAnnouncements = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find offerings relevant to the user (for "course"-targeted announcements)
    let relevantOfferingIds = [];
    if (userRole === 'student') {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (student) {
        const enrollments = await prisma.enrollment.findMany({
          where: { studentId: student.id, status: 'ENROLLED' },
          select: { offeringId: true },
        });
        relevantOfferingIds = enrollments.map((e) => e.offeringId);
      }
    } else if (userRole === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId } });
      if (teacher) {
        const offerings = await prisma.courseOffering.findMany({
          where: { teacherId: teacher.id },
          select: { id: true },
        });
        relevantOfferingIds = offerings.map((o) => o.id);
      }
    }

    const orClauses = [
      { targetAudience: 'all' },
      { targetAudience: userRole === 'student' ? 'students' : 'teachers' },
      { createdBy: userId }, // own announcements (e.g. teacher's course announcements)
    ];
    if (relevantOfferingIds.length > 0) {
      orClauses.push({ targetAudience: 'course', offeringId: { in: relevantOfferingIds } });
    }

    const baseAnnouncements = await prisma.announcement.findMany({
      where: { OR: orClauses },
      orderBy: { createdAt: 'desc' },
    });

    let allAnnouncements = [...baseAnnouncements];

    // Remove duplicates by id
    const uniqueAnnouncements = Array.from(
      new Map(allAnnouncements.map(a => [a.id, a])).values()
    );

    // Sort by date
    uniqueAnnouncements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Enrich with creator info
    const enrichedAnnouncements = await Promise.all(
      uniqueAnnouncements.map(async (ann) => {
        const creator = await prisma.user.findUnique({
          where: { id: ann.createdBy },
          select: { name: true, email: true, role: true }
        });
        return {
          ...ann,
          createdBy: creator
        };
      })
    );

    res.status(200).json(enrichedAnnouncements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get single announcement by ID
 */
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Enrich with creator info
    const creator = await prisma.user.findUnique({
      where: { id: announcement.createdBy },
      select: { name: true, email: true, role: true }
    });

    res.status(200).json({
      success: true,
      data: {
        ...announcement,
        createdBy: creator
      }
    });
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching announcement',
      error: error.message
    });
  }
};

/**
 * Update announcement
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, priority } = req.body;

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check authorization - only creator or admin can update
    if (announcement.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this announcement'
      });
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(priority && { priority })
      }
    });

    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating announcement',
      error: error.message
    });
  }
};

/**
 * Delete announcement
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check authorization - only creator or admin can delete
    if (announcement.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this announcement'
      });
    }

    await prisma.announcement.delete({
      where: { id }
    });

    auditLog({
      action: 'DELETE_ANNOUNCEMENT', category: 'ANNOUNCEMENT',
      performedBy: req.user.id, performedByRole: req.user.role,
      targetModel: 'Announcement', targetId: id,
      description: `Deleted announcement "${announcement.title}"`,
      previousValue: { title: announcement.title, priority: announcement.priority, targetAudience: announcement.targetAudience },
    });

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting announcement',
      error: error.message
    });
  }
};

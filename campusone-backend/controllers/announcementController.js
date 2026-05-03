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
    const { title, content, priority, targetAudience, filters } = req.body;
    const userId = req.user.id;

    // Validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Normalise filters (only persist non-empty values)
    const f = filters || {};
    const cleanFilters = {};
    if (Array.isArray(f.departmentIds) && f.departmentIds.length) cleanFilters.departmentIds = f.departmentIds;
    if (Array.isArray(f.programIds) && f.programIds.length)       cleanFilters.programIds = f.programIds;
    if (Array.isArray(f.batches) && f.batches.length)             cleanFilters.batches = f.batches;
    if (Array.isArray(f.semesters) && f.semesters.length)         cleanFilters.semesters = f.semesters.map(Number);
    const hasFilters = Object.keys(cleanFilters).length > 0;

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'medium',
        createdBy: userId,
        targetAudience: hasFilters ? 'filtered' : targetAudience,
        audienceFilters: hasFilters ? { ...cleanFilters, baseAudience: targetAudience } : null,
      },
    });

    // Get recipients based on targetAudience + optional filters
    let recipients = [];

    // Build student-side filter once (re-used for "students" and "all")
    const buildStudentWhere = () => {
      const where = { role: 'student', isActive: true };
      if (hasFilters) {
        where.student = {};
        if (cleanFilters.departmentIds) where.student.departmentId = { in: cleanFilters.departmentIds };
        if (cleanFilters.programIds)    where.student.programId    = { in: cleanFilters.programIds };
        if (cleanFilters.batches)       where.student.batch        = { in: cleanFilters.batches };
        if (cleanFilters.semesters)     where.student.currentSemester = { in: cleanFilters.semesters };
      }
      return where;
    };

    const buildTeacherWhere = () => {
      const where = { role: { in: ['teacher', 'admin'] }, isActive: true };
      if (hasFilters && cleanFilters.departmentIds) {
        where.OR = [
          { teacher: { departmentId: { in: cleanFilters.departmentIds } } },
          { admin:   { departmentId: { in: cleanFilters.departmentIds } } },
        ];
      }
      return where;
    };

    if (targetAudience === 'all') {
      if (hasFilters) {
        // Apply filters to both halves
        const [students, staff] = await Promise.all([
          prisma.user.findMany({ where: buildStudentWhere(), select: { id: true, email: true, name: true } }),
          prisma.user.findMany({ where: buildTeacherWhere(), select: { id: true, email: true, name: true } }),
        ]);
        recipients = [...students, ...staff];
      } else {
        recipients = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, email: true, name: true },
        });
      }
    } else if (targetAudience === 'teachers') {
      recipients = await prisma.user.findMany({
        where: buildTeacherWhere(),
        select: { id: true, email: true, name: true },
      });
    } else if (targetAudience === 'students') {
      recipients = await prisma.user.findMany({
        where: buildStudentWhere(),
        select: { id: true, email: true, name: true },
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
    let studentProfile = null;
    let teacherProfile = null;
    if (userRole === 'student') {
      studentProfile = await prisma.student.findUnique({ where: { userId } });
      if (studentProfile) {
        const enrollments = await prisma.enrollment.findMany({
          where: { studentId: studentProfile.id, status: 'ENROLLED' },
          select: { offeringId: true },
        });
        relevantOfferingIds = enrollments.map((e) => e.offeringId);
      }
    } else if (userRole === 'teacher') {
      teacherProfile = await prisma.teacher.findUnique({ where: { userId } });
      if (teacherProfile) {
        const offerings = await prisma.courseOffering.findMany({
          where: { teacherId: teacherProfile.id },
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
    // Filtered announcements: include if user matches any of the saved filter criteria.
    orClauses.push({ targetAudience: 'filtered' });

    const baseAnnouncements = await prisma.announcement.findMany({
      where: { OR: orClauses },
      orderBy: { createdAt: 'desc' },
    });

    // Apply audienceFilters in JS for the 'filtered' rows
    let allAnnouncements = baseAnnouncements.filter((a) => {
      if (a.targetAudience !== 'filtered') return true;
      const f = a.audienceFilters || {};
      const baseAud = f.baseAudience;
      // Audience-base check
      if (baseAud === 'students' && userRole !== 'student') return false;
      if (baseAud === 'teachers' && userRole === 'student') return false;
      // Field checks (only relevant to students for now)
      if (userRole === 'student' && studentProfile) {
        if (Array.isArray(f.departmentIds) && f.departmentIds.length && !f.departmentIds.includes(studentProfile.departmentId)) return false;
        if (Array.isArray(f.programIds)    && f.programIds.length    && !f.programIds.includes(studentProfile.programId))       return false;
        if (Array.isArray(f.batches)       && f.batches.length       && !f.batches.includes(studentProfile.batch))               return false;
        if (Array.isArray(f.semesters)     && f.semesters.length     && !f.semesters.includes(studentProfile.currentSemester))   return false;
      } else if (userRole === 'teacher' && teacherProfile) {
        if (Array.isArray(f.departmentIds) && f.departmentIds.length && !f.departmentIds.includes(teacherProfile.departmentId)) return false;
      }
      return true;
    });

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

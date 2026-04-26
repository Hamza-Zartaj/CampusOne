import prisma from '../prisma/client.js';
import { sendAnnouncementEmail } from '../services/emailService.js';

/**
 * Send announcement (Admin)
 * Can filter by: all, teachers, students, specific_course
 */
export const sendAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, targetAudience, courseId } = req.body;
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
        targetAudience,
        courseId: targetAudience === 'specific_course' ? courseId : null
      }
    });

    // Get recipients based on targetAudience
    let recipients = [];

    if (targetAudience === 'all') {
      // All users (admins, teachers, students)
      recipients = await prisma.user.findMany({
        where: { isActive: true },
        select: { email: true, name: true }
      });
    } else if (targetAudience === 'teachers') {
      // All teachers and admins
      recipients = await prisma.user.findMany({
        where: {
          role: { in: ['teacher', 'admin'] },
          isActive: true
        },
        select: { email: true, name: true }
      });
    } else if (targetAudience === 'students') {
      // All students
      recipients = await prisma.user.findMany({
        where: {
          role: 'student',
          isActive: true
        },
        select: { email: true, name: true }
      });
    } else if (targetAudience === 'specific_course' && courseId) {
      // Students enrolled in specific course
      const enrollments = await prisma.enrollment.findMany({
        where: { courseOfferingId: courseId },
        include: {
          student: {
            include: {
              user: {
                select: { email: true, name: true }
              }
            }
          }
        }
      });
      recipients = enrollments.map(e => ({
        email: e.student.user.email,
        name: e.student.user.name
      }));
    }

    // Send emails in background
    if (recipients.length > 0) {
      const emailPromises = recipients.map(recipient =>
        sendAnnouncementEmail({
          email: recipient.email,
          name: recipient.name,
          title,
          content,
          priority
        }).catch(err => console.error(`Failed to send email to ${recipient.email}:`, err))
      );

      // Don't wait for all emails to send, run in background
      Promise.all(emailPromises).catch(err => console.error('Error sending announcement emails:', err));
    }

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
 * Send announcement to course students (Teacher)
 */
export const sendCourseAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, courseId } = req.body;
    const userId = req.user.id;

    // Validation
    if (!title || !content || !courseId) {
      return res.status(400).json({ error: 'Title, content, and courseId are required' });
    }

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || 'medium',
        createdBy: userId,
        targetAudience: 'specific_course',
        courseId
      }
    });

    // Get students enrolled in this course offering
    const enrollments = await prisma.enrollment.findMany({
      where: { courseOfferingId: courseId },
      include: {
        student: {
          include: {
            user: {
              select: { email: true, name: true }
            }
          }
        }
      }
    });

    const recipients = enrollments.map(e => ({
      email: e.student.user.email,
      name: e.student.user.name
    }));

    // Send emails in background
    if (recipients.length > 0) {
      const emailPromises = recipients.map(recipient =>
        sendAnnouncementEmail({
          email: recipient.email,
          name: recipient.name,
          title,
          content,
          priority
        }).catch(err => console.error(`Failed to send email to ${recipient.email}:`, err))
      );

      Promise.all(emailPromises).catch(err => console.error('Error sending announcement emails:', err));
    }

    res.status(201).json({
      message: `Announcement sent to ${recipients.length} students`,
      announcement,
      recipientCount: recipients.length
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
      include: {
        course: {
          select: { id: true, courseName: true }
        }
      },
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

    // Base query: announcements for all users and based on role
    const baseAnnouncements = await prisma.announcement.findMany({
      where: {
        OR: [
          { targetAudience: 'all' },
          { 
            targetAudience: userRole === 'student' ? 'students' : 'teachers'
          }
        ]
      },
      include: {
        course: {
          select: { id: true, courseName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let allAnnouncements = [...baseAnnouncements];

    // If student, also include course-specific announcements
    if (userRole === 'student') {
      const student = await prisma.student.findUnique({
        where: { userId }
      });

      if (student) {
        const enrollments = await prisma.enrollment.findMany({
          where: { studentId: student.id },
          select: { courseOfferingId: true }
        });

        const courseOfferingIds = enrollments.map(e => e.courseOfferingId);

        if (courseOfferingIds.length > 0) {
          const courseSpecificAnnouncements = await prisma.announcement.findMany({
            where: {
              targetAudience: 'specific_course',
              courseId: { in: courseOfferingIds }
            },
            include: {
              course: {
                select: { id: true, courseName: true }
              }
            }
          });

          allAnnouncements = [...allAnnouncements, ...courseSpecificAnnouncements];
        }
      }
    }

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
      where: { id },
      include: {
        course: {
          select: { id: true, courseName: true }
        }
      }
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
      },
      include: {
        course: {
          select: { id: true, courseName: true }
        }
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

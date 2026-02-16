import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import { sendAnnouncementEmail } from '../services/emailService.js';

/**
 * Send announcement (Admin)
 * Can filter by: all, teachers, students, specific_course
 */
export const sendAnnouncement = async (req, res) => {
  try {
    const { title, content, priority, targetAudience, courseId } = req.body;
    const userId = req.user._id;

    // Validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Create announcement
    const announcement = new Announcement({
      title,
      content,
      priority: priority || 'medium',
      createdBy: userId,
      targetAudience,
      courseId: targetAudience === 'specific_course' ? courseId : null
    });

    await announcement.save();

    // Get recipients based on targetAudience
    let recipients = [];

    if (targetAudience === 'all') {
      // All users (admins, teachers, students)
      recipients = await User.find({ isActive: true }).select('email name');
    } else if (targetAudience === 'teachers') {
      // All teachers and admins
      recipients = await User.find({ 
        role: { $in: ['teacher', 'admin'] }, 
        isActive: true 
      }).select('email name');
    } else if (targetAudience === 'students') {
      // All students
      recipients = await User.find({ 
        role: 'student', 
        isActive: true 
      }).select('email name');
    } else if (targetAudience === 'specific_course' && courseId) {
      // Students enrolled in specific course
      const students = await Student.find({}).select('userId');
      const userIds = students.map(s => s.userId);
      recipients = await User.find({ 
        _id: { $in: userIds }, 
        isActive: true 
      }).select('email name');
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
    const userId = req.user._id;

    // Validation
    if (!title || !content || !courseId) {
      return res.status(400).json({ error: 'Title, content, and courseId are required' });
    }

    // Create announcement
    const announcement = new Announcement({
      title,
      content,
      priority: priority || 'medium',
      createdBy: userId,
      targetAudience: 'specific_course',
      courseId
    });

    await announcement.save();

    // Get students enrolled in this course
    const students = await Student.find({}).select('userId');
    const userIds = students.map(s => s.userId);
    const recipients = await User.find({ 
      _id: { $in: userIds }, 
      isActive: true 
    }).select('email name');

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
    const announcements = await Announcement.find()
      .populate('createdBy', 'name email role')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json(announcements);
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
    const userId = req.user._id;
    const userRole = req.user.role;

    let query = {
      $or: [
        { targetAudience: 'all' },
        { targetAudience: userRole === 'student' ? 'students' : 'teachers' }
      ]
    };

    // If student, also include course-specific announcements
    if (userRole === 'student') {
      const student = await Student.findOne({ userId });
      if (student && student.enrolledCourses) {
        const courseIds = student.enrolledCourses.map(ec => ec.courseId);
        query.$or.push({ 
          targetAudience: 'specific_course',
          courseId: { $in: courseIds }
        });
      }
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name email role')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete announcement
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Only creator or admin can delete
    if (announcement.createdBy.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this announcement' });
    }

    await Announcement.findByIdAndDelete(id);

    res.status(200).json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: error.message });
  }
};

import express from 'express';
import * as announcementController from '../controllers/announcementController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all announcements (Admin only)
router.get('/all', protect, authorize('admin'), announcementController.getAnnouncements);

// Get announcements for current user
router.get('/', protect, announcementController.getMyAnnouncements);

// Send announcement (Admin only)
router.post('/send', protect, authorize('admin'), announcementController.sendAnnouncement);

// Send course announcement (Teachers)
router.post('/course', protect, authorize('teacher', 'admin'), announcementController.sendCourseAnnouncement);

// Delete announcement (Creator or Admin)
router.delete('/:id', protect, announcementController.deleteAnnouncement);

export default router;

import express from 'express';
import * as announcementController from '../controllers/announcementController.js';
import { protect, authorize, authorizePermission } from '../middleware/auth.js';

const router = express.Router();

// Get all announcements (admin only — manage_announcements)
router.get('/all', protect, authorizePermission('manage_announcements'), announcementController.getAnnouncements);

// Get announcements for current user (any authenticated user)
router.get('/', protect, announcementController.getMyAnnouncements);

// Send announcement (admin only — manage_announcements)
router.post('/send', protect, authorizePermission('manage_announcements'), announcementController.sendAnnouncement);

// Send course announcement (teachers + admins for their offerings)
router.post('/course', protect, authorize('teacher', 'admin'), announcementController.sendCourseAnnouncement);

// Delete announcement (creator or admin)
router.delete('/:id', protect, announcementController.deleteAnnouncement);

export default router;

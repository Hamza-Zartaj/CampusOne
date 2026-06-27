import logger from '../utils/logger.js';
import prisma from '../prisma/client.js';

// GET /api/notifications?unread=true&limit=50
export const getMyNotifications = async (req, res) => {
  try {
    const { unread, limit } = req.query;
    const where = { userId: req.user.id };
    if (unread === 'true') where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? Math.min(+limit, 200) : 50,
    });

    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    logger.error('[notifications] get error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ success: true, count });
  } catch (err) {
    logger.error('[notifications] unread-count error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    if (notification.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Not your notification' });

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error('[notifications] mark-read error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, count: result.count });
  } catch (err) {
    logger.error('[notifications] mark-all-read error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    if (notification.userId !== req.user.id) return res.status(403).json({ success: false, message: 'Not your notification' });

    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error('[notifications] delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/notifications  — clear all read
export const clearRead = async (req, res) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: { userId: req.user.id, isRead: true },
    });
    res.json({ success: true, count: result.count });
  } catch (err) {
    logger.error('[notifications] clear-read error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

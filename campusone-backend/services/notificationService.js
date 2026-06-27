import prisma from '../prisma/client.js';
import { emitToUser, emitToUsers } from './socketService.js';

export const TYPE = {
  ANNOUNCEMENT:        'ANNOUNCEMENT',
  ASSIGNMENT_NEW:      'ASSIGNMENT_NEW',
  ASSIGNMENT_GRADED:   'ASSIGNMENT_GRADED',
  ASSIGNMENT_DUE_SOON: 'ASSIGNMENT_DUE_SOON',
  QUIZ_NEW:            'QUIZ_NEW',
  QUIZ_GRADED:         'QUIZ_GRADED',
  QUIZ_OPENING_SOON:   'QUIZ_OPENING_SOON',
  QNA_NEW:             'QNA_NEW',
  QNA_REPLY:           'QNA_REPLY',
  ATTENDANCE_LOW:      'ATTENDANCE_LOW',
  ADMISSION_STATUS:    'ADMISSION_STATUS',
  LEAVE_APPLICATION:   'LEAVE_APPLICATION',
  LEAVE_DECISION:      'LEAVE_DECISION',
  COURSE_DROPPED:      'COURSE_DROPPED',
  FINE_ISSUED:         'FINE_ISSUED',
  TA_APPLICATION:      'TA_APPLICATION',
  TA_APPROVED:         'TA_APPROVED',
  TA_DECISION:         'TA_DECISION',
  TA_RELIEVED:         'TA_RELIEVED',
  GENERAL:             'GENERAL',
};

const retry = async (fn, attempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 150));
      }
    }
  }
  throw lastError;
};

export const notify = async ({ userId, type, title, body, linkUrl, metadata }) => {
  if (!userId || !type || !title) return null;
  try {
    const notification = await retry(() =>
      prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body: body ?? null,
        linkUrl: linkUrl ?? null,
        metadata: metadata ?? {},
      },
    }));
    emitToUser(userId, 'notification:new', notification);
    return notification;
  } catch (err) {
    console.error('[notify] failed:', err.message);
    return null;
  }
};

export const notifyMany = async ({ userIds, type, title, body, linkUrl, metadata }) => {
  if (!Array.isArray(userIds) || userIds.length === 0 || !type || !title) return { count: 0 };
  try {
    const result = await retry(() =>
      prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        body: body ?? null,
        linkUrl: linkUrl ?? null,
        metadata: metadata ?? {},
      })),
    }));
    emitToUsers(userIds, 'notification:new', { type, title, body, linkUrl, metadata });
    return result;
  } catch (err) {
    console.error('[notifyMany] failed:', err.message);
    return { count: 0 };
  }
};

export default { notify, notifyMany, TYPE };

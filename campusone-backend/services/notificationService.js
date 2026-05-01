import prisma from '../prisma/client.js';

/**
 * Fire-and-forget notification creation.
 * Caller passes recipient userId(s); never await this in request handlers.
 *
 * Usage:
 *   notify({ userId, type, title, body, linkUrl, metadata });
 *   notifyMany({ userIds: [...], type, title, body, linkUrl, metadata });
 */

export const TYPE = {
  ANNOUNCEMENT:       'ANNOUNCEMENT',
  ASSIGNMENT_NEW:     'ASSIGNMENT_NEW',
  ASSIGNMENT_GRADED:  'ASSIGNMENT_GRADED',
  QUIZ_NEW:           'QUIZ_NEW',
  QUIZ_GRADED:        'QUIZ_GRADED',
  QNA_NEW:            'QNA_NEW',
  QNA_REPLY:          'QNA_REPLY',
  ATTENDANCE_LOW:     'ATTENDANCE_LOW',
  ADMISSION_STATUS:   'ADMISSION_STATUS',
  GENERAL:            'GENERAL',
};

export const notify = ({ userId, type, title, body, linkUrl, metadata }) => {
  if (!userId || !type || !title) return;
  prisma.notification
    .create({
      data: {
        userId,
        type,
        title,
        body: body ?? null,
        linkUrl: linkUrl ?? null,
        metadata: metadata ?? {},
      },
    })
    .catch((err) => console.error('[notify] failed:', err.message));
};

export const notifyMany = ({ userIds, type, title, body, linkUrl, metadata }) => {
  if (!Array.isArray(userIds) || userIds.length === 0 || !type || !title) return;
  prisma.notification
    .createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        body: body ?? null,
        linkUrl: linkUrl ?? null,
        metadata: metadata ?? {},
      })),
    })
    .catch((err) => console.error('[notifyMany] failed:', err.message));
};

export default { notify, notifyMany, TYPE };

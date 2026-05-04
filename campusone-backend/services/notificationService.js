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
    .then((n) => emitToUser(userId, 'notification:new', n))
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
    .then(() => emitToUsers(userIds, 'notification:new', { type, title, body, linkUrl, metadata }))
    .catch((err) => console.error('[notifyMany] failed:', err.message));
};

export default { notify, notifyMany, TYPE };

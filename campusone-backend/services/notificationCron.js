import logger from '../utils/logger.js';
import cron from 'node-cron';
import prisma from '../prisma/client.js';
import { notifyMany, TYPE } from './notificationService.js';

const HOUR_MS = 60 * 60 * 1000;

// Looks at assignments whose dueDate falls in the next 24h-26h window and
// notifies enrolled students who haven't already been pinged about *this* assignment.
// The 26h ceiling means a single hourly tick will reliably catch each due item once;
// dedupe still relies on the metadata.assignmentId fingerprint.
const sendAssignmentDueSoon = async () => {
  const now = new Date();
  const lower = new Date(now.getTime() + 24 * HOUR_MS);
  const upper = new Date(now.getTime() + 26 * HOUR_MS);

  const assignments = await prisma.assignment.findMany({
    where: { status: 'PUBLISHED', dueDate: { gte: lower, lt: upper } },
    include: {
      offering: { select: { course: { select: { code: true, title: true } } } },
    },
  });

  for (const a of assignments) {
    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId: a.offeringId, status: 'ENROLLED' },
      select: { student: { select: { userId: true } } },
    });
    const userIds = enrollments.map((e) => e.student.userId);
    if (userIds.length === 0) continue;

    // Skip students that already received a DUE_SOON notification for this assignment.
    const already = await prisma.notification.findMany({
      where: {
        userId: { in: userIds },
        type: TYPE.ASSIGNMENT_DUE_SOON,
        metadata: { path: ['assignmentId'], equals: a.id },
      },
      select: { userId: true },
    });
    const sent = new Set(already.map((n) => n.userId));
    const recipients = userIds.filter((id) => !sent.has(id));
    if (recipients.length === 0) continue;

    notifyMany({
      userIds: recipients,
      type: TYPE.ASSIGNMENT_DUE_SOON,
      title: `Assignment due in 24h: ${a.title}`,
      body: `${a.offering.course.code} — ${a.title} is due ${a.dueDate.toLocaleString()}.`,
      linkUrl: `/student/assignments`,
      metadata: { assignmentId: a.id, offeringId: a.offeringId },
    });
  }
};

const sendQuizOpeningSoon = async () => {
  const now = new Date();
  const lower = new Date(now.getTime() + 24 * HOUR_MS);
  const upper = new Date(now.getTime() + 26 * HOUR_MS);

  const quizzes = await prisma.quiz.findMany({
    where: { status: 'PUBLISHED', startAt: { gte: lower, lt: upper } },
    include: {
      offering: { select: { course: { select: { code: true, title: true } } } },
    },
  });

  for (const q of quizzes) {
    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId: q.offeringId, status: 'ENROLLED' },
      select: { student: { select: { userId: true } } },
    });
    const userIds = enrollments.map((e) => e.student.userId);
    if (userIds.length === 0) continue;

    const already = await prisma.notification.findMany({
      where: {
        userId: { in: userIds },
        type: TYPE.QUIZ_OPENING_SOON,
        metadata: { path: ['quizId'], equals: q.id },
      },
      select: { userId: true },
    });
    const sent = new Set(already.map((n) => n.userId));
    const recipients = userIds.filter((id) => !sent.has(id));
    if (recipients.length === 0) continue;

    notifyMany({
      userIds: recipients,
      type: TYPE.QUIZ_OPENING_SOON,
      title: `Quiz opens in 24h: ${q.title}`,
      body: `${q.offering.course.code} — ${q.title} opens ${q.startAt.toLocaleString()}.`,
      linkUrl: `/student/quizzes`,
      metadata: { quizId: q.id, offeringId: q.offeringId },
    });
  }
};

export const startNotificationCron = () => {
  // Hourly at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      await sendAssignmentDueSoon();
      await sendQuizOpeningSoon();
    } catch (err) {
      logger.error('[notification-cron] tick failed:', err.message);
    }
  });
  logger.info('🕐 Notification cron started (hourly: assignment + quiz 24h reminders)');
};

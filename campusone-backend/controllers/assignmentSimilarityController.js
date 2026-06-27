import logger from '../utils/logger.js';
import prisma from '../prisma/client.js';
import { analyzeSubmissionsStageOne } from '../services/assignmentSimilarityService.js';

const verifyTeacherAssignment = async (userId, assignmentId) => {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!teacher) return { error: 'Teacher profile not found', status: 403 };

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, offering: { teacherId: teacher.id } },
    select: { id: true, title: true, status: true },
  });
  if (!assignment) return { error: 'Assignment not found or not owned by you', status: 404 };
  return { assignment };
};

const reportInclude = {
  matches: {
    include: {
      submissionA: {
        select: {
          id: true,
          student: { select: { studentId: true, user: { select: { name: true } } } },
        },
      },
      submissionB: {
        select: {
          id: true,
          student: { select: { studentId: true, user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { combinedScore: 'desc' },
  },
};

const getCurrentSnapshot = async (assignmentId) => prisma.submission.findMany({
  where: { assignmentId },
  select: { id: true, updatedAt: true },
  orderBy: { id: 'asc' },
});

const isReportStale = (report, currentSubmissions) => {
  const saved = Array.isArray(report.submissionSnapshot) ? report.submissionSnapshot : [];
  if (saved.length !== currentSubmissions.length) return true;
  const savedUpdates = new Map(saved.map((entry) => [entry.submissionId, new Date(entry.updatedAt).getTime()]));
  return currentSubmissions.some(
    (submission) => savedUpdates.get(submission.id) !== new Date(submission.updatedAt).getTime()
  );
};

// POST /api/assignments/:id/similarity/scan
export const runStageOneSimilarityScan = async (req, res) => {
  let reportId;
  try {
    const check = await verifyTeacherAssignment(req.user.id, req.params.id);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });
    if (check.assignment.status !== 'CLOSED') {
      return res.status(409).json({
        success: false,
        code: 'SUBMISSIONS_NOT_CLOSED',
        message: 'Close submissions before running a similarity scan',
      });
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: check.assignment.id },
      select: {
        id: true,
        submissionText: true,
        attachmentUrl: true,
        updatedAt: true,
      },
      orderBy: { id: 'asc' },
    });
    if (submissions.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least two submissions are required for similarity checking',
      });
    }

    const initialReport = await prisma.similarityReport.create({
      data: {
        assignmentId: check.assignment.id,
        createdById: req.user.id,
        status: 'RUNNING',
        submissionSnapshot: submissions.map((submission) => ({
          submissionId: submission.id,
          updatedAt: submission.updatedAt,
        })),
      },
    });
    reportId = initialReport.id;

    const analysis = await analyzeSubmissionsStageOne(submissions);
    const report = await prisma.$transaction(async (tx) => {
      if (analysis.matches.length > 0) {
        await tx.similarityMatch.createMany({
          data: analysis.matches.map((match) => ({ reportId, ...match })),
        });
      }
      return tx.similarityReport.update({
        where: { id: reportId },
        data: {
          status: 'COMPLETED',
          submissionSnapshot: analysis.snapshot,
          summary: analysis.summary,
          completedAt: new Date(),
        },
        include: reportInclude,
      });
    });

    res.json({ success: true, data: { ...report, isStale: false } });
  } catch (error) {
    if (reportId) {
      await prisma.similarityReport.update({
        where: { id: reportId },
        data: { status: 'FAILED', error: error.message.slice(0, 1000), completedAt: new Date() },
      }).catch(() => {});
    }
    logger.error('Stage 1 similarity scan failed:', error.message);
    res.status(500).json({ success: false, message: 'Similarity scan failed. Please try again.' });
  }
};

// GET /api/assignments/:id/similarity/latest
export const getLatestSimilarityReport = async (req, res) => {
  try {
    const check = await verifyTeacherAssignment(req.user.id, req.params.id);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    const report = await prisma.similarityReport.findFirst({
      where: { assignmentId: check.assignment.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: reportInclude,
    });
    if (!report) return res.json({ success: true, data: null });

    const currentSubmissions = await getCurrentSnapshot(check.assignment.id);
    res.json({
      success: true,
      data: {
        ...report,
        isStale: isReportStale(report, currentSubmissions),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import logger from '../utils/logger.js';
import prisma from '../prisma/client.js';
import { auditLog } from '../utils/auditLogger.js';
import {
  analyzeSubmissionsStageOne,
  analyzeSubmissionsStageTwo,
} from '../services/assignmentSimilarityService.js';

const stageTwoWindows = new Map();
const STAGE_TWO_WINDOW_MS = 60_000;
const MAX_STAGE_TWO_REQUESTS_PER_WINDOW = 3;

const consumeStageTwoAllowance = (userId) => {
  const now = Date.now();
  const recent = (stageTwoWindows.get(userId) || []).filter((timestamp) => now - timestamp < STAGE_TWO_WINDOW_MS);
  if (recent.length >= MAX_STAGE_TWO_REQUESTS_PER_WINDOW) return false;
  recent.push(now);
  stageTwoWindows.set(userId, recent);
  return true;
};

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
      review: true,
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

// POST /api/assignments/:id/similarity/ai-scan
export const runStageTwoSimilarityScan = async (req, res) => {
  try {
    const check = await verifyTeacherAssignment(req.user.id, req.params.id);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });
    if (check.assignment.status !== 'CLOSED') {
      return res.status(409).json({
        success: false,
        code: 'SUBMISSIONS_NOT_CLOSED',
        message: 'Close submissions before running the Stage 2 AI scan',
      });
    }

    const report = await prisma.similarityReport.findFirst({
      where: { assignmentId: check.assignment.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: reportInclude,
    });
    if (!report) {
      return res.status(409).json({
        success: false,
        code: 'STAGE_ONE_REQUIRED',
        message: 'Run the Stage 1 local scan before starting the Stage 2 AI scan',
      });
    }

    const currentSubmissions = await getCurrentSnapshot(check.assignment.id);
    if (isReportStale(report, currentSubmissions)) {
      return res.status(409).json({
        success: false,
        code: 'STAGE_ONE_STALE',
        message: 'Submissions changed after the Stage 1 scan. Run Stage 1 again first.',
      });
    }

    if (!consumeStageTwoAllowance(req.user.id)) {
      return res.status(429).json({
        success: false,
        code: 'AI_RATE_LIMITED',
        message: 'Please wait a minute before running more Stage 2 AI scans',
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

    const analysis = await analyzeSubmissionsStageTwo({
      prisma,
      assignmentId: check.assignment.id,
      stageOneReport: report,
      submissions,
      includeExplanations: req.body?.includeExplanations !== false,
    });

    const updatedReport = await prisma.$transaction(async (tx) => {
      await tx.similarityMatch.deleteMany({
        where: { reportId: report.id, matchType: 'SEMANTIC' },
      });

      if (analysis.matches.length > 0) {
        await tx.similarityMatch.createMany({
          data: analysis.matches.map((match) => ({ reportId: report.id, ...match })),
        });
      }

      const localFlaggedPairs = await tx.similarityMatch.count({
        where: { reportId: report.id, NOT: { matchType: 'SEMANTIC' } },
      });
      const nextSummary = {
        ...(report.summary || {}),
        ...analysis.summary,
        flaggedPairs: localFlaggedPairs + analysis.matches.length,
      };

      return tx.similarityReport.update({
        where: { id: report.id },
        data: {
          summary: nextSummary,
          completedAt: new Date(),
        },
        include: reportInclude,
      });
    });

    await auditLog({
      action: 'ASSIGNMENT_SIMILARITY_STAGE2_SCAN',
      category: 'ACADEMIC_INTEGRITY',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'SimilarityReport',
      targetId: report.id,
      description: `Stage 2 AI similarity scan completed for assignment "${check.assignment.title}"`,
      newValue: analysis.summary,
    });

    res.json({ success: true, data: { ...updatedReport, isStale: false } });
  } catch (error) {
    if (error.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, code: error.code, message: error.message });
    }
    if (error.code === 'AI_INVALID_EMBEDDING') {
      return res.status(422).json({ success: false, code: error.code, message: error.message });
    }
    if (error.status === 401) {
      return res.status(503).json({
        success: false,
        code: 'AI_AUTH_FAILED',
        message: 'The configured OpenAI API key was rejected. Check OPENAI_API_KEY and restart the backend.',
      });
    }
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        code: 'AI_PROVIDER_RATE_LIMIT',
        message: 'OpenAI is temporarily rate-limiting requests. Please try again shortly.',
      });
    }

    logger.error('Stage 2 similarity scan failed:', error.message);
    res.status(500).json({ success: false, message: 'Stage 2 AI similarity scan failed. Please try again.' });
  }
};

// PUT /api/assignments/:id/similarity/matches/:matchId/review
export const reviewSimilarityMatch = async (req, res) => {
  try {
    const check = await verifyTeacherAssignment(req.user.id, req.params.id);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    const allowed = new Set(['PENDING', 'CONFIRMED', 'DISMISSED', 'NEEDS_DISCUSSION']);
    const decision = String(req.body?.decision || '').toUpperCase();
    if (!allowed.has(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid review decision' });
    }

    const notes = String(req.body?.notes || '').trim();
    if (notes.length > 1000) {
      return res.status(400).json({ success: false, message: 'Review notes cannot exceed 1000 characters' });
    }

    const match = await prisma.similarityMatch.findFirst({
      where: {
        id: req.params.matchId,
        report: { assignmentId: check.assignment.id },
      },
      include: { review: true },
    });
    if (!match) return res.status(404).json({ success: false, message: 'Similarity match not found' });

    await prisma.similarityMatchReview.upsert({
      where: { matchId: match.id },
      create: {
        matchId: match.id,
        decision,
        notes: notes || null,
        reviewedById: req.user.id,
      },
      update: {
        decision,
        notes: notes || null,
        reviewedById: req.user.id,
        reviewedAt: new Date(),
      },
    });

    await auditLog({
      action: 'ASSIGNMENT_SIMILARITY_MATCH_REVIEWED',
      category: 'ACADEMIC_INTEGRITY',
      performedBy: req.user.id,
      performedByRole: req.user.role,
      targetModel: 'SimilarityMatch',
      targetId: match.id,
      description: `Teacher marked a similarity match as ${decision}`,
      previousValue: match.review,
      newValue: { decision, notes: notes || null },
    });

    const report = await prisma.similarityReport.findFirst({
      where: { assignmentId: check.assignment.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: reportInclude,
    });
    const currentSubmissions = await getCurrentSnapshot(check.assignment.id);
    res.json({
      success: true,
      data: {
        ...report,
        isStale: isReportStale(report, currentSubmissions),
      },
    });
  } catch (error) {
    logger.error('Similarity review failed:', error.message);
    res.status(500).json({ success: false, message: 'Similarity review failed. Please try again.' });
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

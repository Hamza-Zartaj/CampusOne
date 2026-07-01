import prisma from '../prisma/client.js';
import { runQuizExpiryMaintenance } from '../services/quizLifecycleService.js';
import { buildTranscriptData } from '../utils/transcript.js';
import { computeWeightedBreakdown } from '../utils/grading.js';

// GET /api/students/me/course-detail/:offeringId
// Bundle endpoint for the My Courses page.
export const courseDetail = async (req, res) => {
  try {
    const offeringId = req.params.offeringId;
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_offeringId: { studentId: student.id, offeringId } },
      include: {
        markComponents: { orderBy: [{ kind: 'asc' }, { index: 'asc' }] },
        offering: {
          include: {
            course: {
              include: { gradeComponents: { orderBy: { orderIndex: 'asc' } } },
            },
            term: { select: { id: true, code: true, academicYear: true, isActive: true } },
            teacher: { select: { user: { select: { name: true, email: true } } } },
            sessions: { include: { room: true }, orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }] },
          },
        },
      },
    });
    if (!enrollment) return res.status(404).json({ success: false, message: 'You are not enrolled in this offering' });

    await runQuizExpiryMaintenance({ studentId: student.id, offeringId });

    const [lectures, taResources, attendance, assignments, quizzes] = await Promise.all([
      prisma.lecture.findMany({
        where: { offeringId },
        orderBy: { date: 'desc' },
      }),
      prisma.tAResource.findMany({
        where: { offeringId },
        include: { uploadedBy: { select: { studentId: true, user: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attendance.findMany({
        where: { offeringId, studentId: student.id },
        orderBy: { date: 'desc' },
      }),
      prisma.assignment.findMany({
        where: { offeringId, status: { in: ['PUBLISHED', 'CLOSED'] } },
        include: {
          submissions: { where: { studentId: student.id } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.quiz.findMany({
        where: { offeringId, status: { in: ['PUBLISHED', 'CLOSED'] } },
        include: {
          attempts: { where: { studentId: student.id } },
          _count: { select: { questions: true } },
        },
        orderBy: { startAt: 'asc' },
      }),
    ]);

    // Attendance summary
    const att = { total: attendance.length, present: 0, late: 0, absent: 0 };
    for (const a of attendance) {
      if (a.status === 'PRESENT') att.present++;
      else if (a.status === 'LATE') att.late++;
      else att.absent++;
    }
    att.percentage = att.total ? Math.round(((att.present + att.late) / att.total) * 100) : null;

    // Compute running grade — weighted % over graded *and released* portion
    const components = enrollment.offering.course.gradeComponents;
    const releasedKinds = new Set(components.filter((c) => c.marksReleased).map((c) => c.kind));

    // Redact obtainedMarks for unreleased components before sending to student
    const myMarks = enrollment.markComponents.map((m) => ({
      ...m,
      obtainedMarks: releasedKinds.has(m.kind) ? m.obtainedMarks : null,
    }));

    // Attach submission file (URL/name) to ASSIGNMENT mark rows so students can
    // re-download what they submitted.
    const subByAssignment = new Map(
      assignments.flatMap((a) => (a.submissions || []).map((s) => [a.id, s])),
    );
    // We need to match assignment marks to assignments. The MarkComponent rows
    // for ASSIGNMENT kind are indexed 1..count by orderIndex; we match by index
    // against assignments sorted by createdAt.
    const sortedAssignments = [...assignments].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
    for (const m of myMarks) {
      if (m.kind !== 'ASSIGNMENT') continue;
      const a = sortedAssignments[m.index - 1];
      if (!a) continue;
      const sub = subByAssignment.get(a.id);
      if (sub?.attachmentUrl) {
        m.submissionFileUrl = sub.attachmentUrl;
        // Derive a friendly filename from the URL (last path segment, decoded).
        try {
          const segs = new URL(sub.attachmentUrl).pathname.split('/');
          m.submissionFileName = decodeURIComponent(segs[segs.length - 1]) || 'submission';
        } catch {
          m.submissionFileName = 'submission';
        }
      }
    }

    const runningGrade = computeWeightedBreakdown(components, enrollment.markComponents, { releasedOnly: true });

    res.json({
      success: true,
      data: {
        offering: enrollment.offering,
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          gradeLetter: enrollment.gradeLetter,
        },
        lectures,
        taResources,
        attendance: { records: attendance, summary: att },
        markComponents: myMarks,
        assignments,
        quizzes,
        runningGrade: {
          earnedPercent: runningGrade.earnedPercent,
          gradedWeight: runningGrade.gradedWeight,
          breakdown: runningGrade.breakdown,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/me/active-assignments
// Only returns published assignments where:
//  - student has not submitted yet, OR
//  - student submitted but hasn't been graded yet.
export const activeAssignments = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    if (!activeTerm) return res.json({ success: true, data: [] });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ENROLLED', offering: { termId: activeTerm.id } },
      select: { offeringId: true },
    });
    const offeringIds = enrollments.map((e) => e.offeringId);

    const assignments = await prisma.assignment.findMany({
      where: { offeringId: { in: offeringIds }, status: 'PUBLISHED' },
      include: {
        offering: { select: { course: { select: { code: true, title: true } }, section: true } },
        submissions: { where: { studentId: student.id } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const filtered = assignments.filter((a) => {
      const sub = a.submissions[0];
      if (!sub) return true;                 // not yet submitted
      if (sub.status !== 'GRADED') return true; // submitted but awaiting grade
      return false;
    });
    res.json({ success: true, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/me/active-quizzes
// Quizzes in current offerings the student hasn't completed yet (or that are upcoming).
export const activeQuizzes = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    if (!activeTerm) return res.json({ success: true, data: [] });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ENROLLED', offering: { termId: activeTerm.id } },
      select: { offeringId: true },
    });
    const offeringIds = enrollments.map((e) => e.offeringId);
    const now = new Date();

    const quizzes = await prisma.quiz.findMany({
      where: {
        offeringId: { in: offeringIds },
        status: 'PUBLISHED',
        deliveryMode: 'ONLINE',
        endAt: { gt: now }, // not expired
      },
      include: {
        offering: { select: { course: { select: { code: true, title: true } }, section: true } },
        attempts: { where: { studentId: student.id } },
        _count: { select: { questions: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    const filtered = quizzes.filter((q) => {
      const att = q.attempts[0];
      if (!att) return true;
      return !['SUBMITTED', 'AUTO_SUBMITTED'].includes(att.status); // still in progress
    });
    res.json({ success: true, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/me/courses — list of currently-enrolled offerings (for the My Courses dropdown)
export const myCourses = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    if (!activeTerm) return res.json({ success: true, data: [], term: null });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ENROLLED', offering: { termId: activeTerm.id } },
      include: {
        offering: {
          include: {
            course: { select: { id: true, code: true, title: true, creditHours: true, sessionType: true } },
            teacher: { select: { user: { select: { name: true } } } },
            sessions: { include: { room: true }, orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }] },
          },
        },
      },
    });
    res.json({ success: true, data: enrollments, term: activeTerm });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/me/transcript
export const myTranscript = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const transcript = await buildTranscriptData(student.id);
    res.json({ success: true, data: transcript });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

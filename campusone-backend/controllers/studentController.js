import prisma from '../prisma/client.js';
import { runQuizExpiryMaintenance } from '../services/quizLifecycleService.js';
import { buildTranscriptData } from '../utils/transcript.js';
import { computeWeightedBreakdown } from '../utils/grading.js';
import { isExcusedAbsence, summarizeAttendanceRecords } from '../utils/attendanceSummary.js';
import { getQuizMarkTotal } from '../utils/courseworkMarks.js';
import { getAttendancePolicy } from '../utils/attendancePolicy.js';

const MARK_ONLY_KINDS = new Set(['MID', 'FINAL', 'PROJECT_PRESENTATION', 'PARTICIPATION', 'LAB_WORK']);

const markKey = (kind, index) => `${kind}:${index}`;

const filenameFromUrl = (url, fallback = 'file') => {
  if (!url) return null;
  try {
    const segs = new URL(url).pathname.split('/');
    return decodeURIComponent(segs[segs.length - 1]) || fallback;
  } catch {
    return fallback;
  }
};

const hasCreatedMarkOnlySlot = (mark) => (
  MARK_ONLY_KINDS.has(mark.kind)
  && (
    !!mark.title
    || !!mark.date
    || (mark.obtainedMarks !== null && mark.obtainedMarks !== undefined)
    || !!mark.fileUrl
  )
);

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

    const [lectures, taResources, attendance, approvedLeaveApplications, assignments, quizzes] = await Promise.all([
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
      prisma.leaveApplication.findMany({
        where: { offeringId, studentId: student.id, status: 'APPROVED' },
        select: { fromDate: true, toDate: true },
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
    const attendancePolicy = await getAttendancePolicy();

    // Attendance summary
    const attendanceSummary = summarizeAttendanceRecords({
      records: attendance,
      approvedApplications: approvedLeaveApplications,
      emptyPercentage: null,
      excusedOnlyPercentage: 100,
      excusedAbsenceReducesTotal: attendancePolicy.excusedAbsenceReducesTotal,
    });
    const { approvedDates, ...att } = attendanceSummary;

    // Compute running grade — weighted % over graded *and released* portion
    const components = enrollment.offering.course.gradeComponents;
    const releasedKinds = new Set(components.filter((c) => c.marksReleased).map((c) => c.kind));

    // Redact obtainedMarks for unreleased components before sending to student.
    // The full mark set is still used for running-grade math below; the
    // student-facing list is trimmed to real coursework/configured assessments.
    const myMarks = enrollment.markComponents.map((m) => ({
      ...m,
      obtainedMarks: releasedKinds.has(m.kind) ? m.obtainedMarks : null,
    }));

    const subByAssignment = new Map(
      assignments.flatMap((a) => (a.submissions || []).map((s) => [a.id, s])),
    );
    const marksBySlot = new Map(
      myMarks.map((mark) => [markKey(mark.kind, mark.index), mark]),
    );
    const componentByKind = new Map(components.map((component) => [component.kind, component]));

    const assignmentMarks = assignments
      .filter((assignment) => assignment.componentIndex)
      .sort((a, b) => Number(a.componentIndex) - Number(b.componentIndex))
      .map((assignment) => {
        const index = Number(assignment.componentIndex);
        const mark = marksBySlot.get(markKey('ASSIGNMENT', index));
        const sub = subByAssignment.get(assignment.id);
        return {
          ...(mark || {}),
          id: mark?.id || `assignment-${assignment.id}`,
          kind: 'ASSIGNMENT',
          index,
          title: assignment.title,
          date: assignment.dueDate,
          totalMarks: assignment.totalMarks,
          fileUrl: assignment.attachmentUrl,
          fileName: filenameFromUrl(assignment.attachmentUrl),
          obtainedMarks: mark?.obtainedMarks ?? null,
          submissionFileUrl: sub?.attachmentUrl || null,
          submissionFileName: sub?.attachmentUrl ? filenameFromUrl(sub.attachmentUrl, 'submission') : null,
        };
      });

    const quizTotalMarks = getQuizMarkTotal(componentByKind.get('QUIZ'));
    const quizMarks = quizzes
      .filter((quiz) => quiz.componentIndex)
      .sort((a, b) => Number(a.componentIndex) - Number(b.componentIndex))
      .map((quiz) => {
        const index = Number(quiz.componentIndex);
        const mark = marksBySlot.get(markKey('QUIZ', index));
        return {
          ...(mark || {}),
          id: mark?.id || `quiz-${quiz.id}`,
          kind: 'QUIZ',
          index,
          title: quiz.title,
          date: quiz.startAt,
          totalMarks: mark?.totalMarks ?? quizTotalMarks ?? quiz.totalMarks,
          obtainedMarks: mark?.obtainedMarks ?? null,
        };
      });

    const markOnlyRows = myMarks
      .filter(hasCreatedMarkOnlySlot)
      .sort((a, b) => a.index - b.index);

    const visibleMarkComponents = [
      ...assignmentMarks,
      ...quizMarks,
      ...markOnlyRows,
    ];

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
        attendance: {
          records: attendance.map((record) => ({
            ...record,
            isExcused: isExcusedAbsence(record, approvedDates),
          })),
          summary: { total: att.totalSessions, ...att },
        },
        markComponents: visibleMarkComponents,
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

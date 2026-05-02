import prisma from '../prisma/client.js';
import { notify } from '../services/notificationService.js';
import AuditLogger from '../services/auditLogger.js';

// ─── CONFIG ────────────────────────────────────────────────────────
// UCP-style quota:
//   n = ABSENT + 0.5 * LATE + (unapproved leave days)
//   0..4 → free, 4..6 → fined, >6 → drop-off
export const LEAVE_CONFIG = {
  freeQuota: 4,
  fineQuota: 6,        // exclusive upper bound for fined band
  finePerAbsent: 500,  // PKR per absent inside the fined band
};

// Determine whether a date string (YYYY-MM-DD) lies between two YYYY-MM-DD dates inclusive.
const dateInRange = (date, from, to) => date >= from && date <= to;

// Expand a from/to range into list of YYYY-MM-DD dates.
const expandDateRange = (from, to) => {
  const dates = [];
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

// Compute the leave-status counter for one student in one offering.
// Returns { totalLectures, present, absent, late, approvedLeaveDays, n, band, dropOff }
const computeCounter = async ({ studentId, offeringId }) => {
  const [attendances, approvedApps] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId, offeringId } }),
    prisma.leaveApplication.findMany({
      where: { studentId, offeringId, status: 'APPROVED' },
    }),
  ]);

  const totalLectures = attendances.length;
  let present = 0, absent = 0, late = 0;
  for (const a of attendances) {
    if (a.status === 'PRESENT') present++;
    else if (a.status === 'ABSENT') absent++;
    else if (a.status === 'LATE') late++;
  }

  // Days that are ABSENT but covered by an approved leave don't count toward `n`.
  const approvedDates = new Set();
  let approvedLeaveDays = 0;
  for (const app of approvedApps) {
    for (const d of expandDateRange(app.fromDate, app.toDate)) {
      if (!approvedDates.has(d)) {
        approvedDates.add(d);
        approvedLeaveDays++;
      }
    }
  }

  let countedAbsent = 0;
  for (const a of attendances) {
    if (a.status === 'ABSENT' && !approvedDates.has(a.date)) countedAbsent++;
  }

  const n = countedAbsent + 0.5 * late;

  let band = 'free';
  if (n > LEAVE_CONFIG.fineQuota) band = 'dropoff';
  else if (n > LEAVE_CONFIG.freeQuota) band = 'fined';

  return {
    totalLectures,
    present,
    absent,
    late,
    approvedLeaveDays,
    countedAbsent,
    n,
    band,
    dropOff: band === 'dropoff',
  };
};

// Generate Fine rows for a student/offering when n is in 4..6 band.
// Idempotent: skips creation if total fines already match the absent count above the free threshold.
const generateFines = async ({ studentId, offeringId, counter }) => {
  if (counter.band === 'free') return 0;
  // Number of fineable absents = countedAbsent above the free quota, capped at fineQuota - freeQuota
  const fineable = Math.max(
    0,
    Math.min(counter.countedAbsent, LEAVE_CONFIG.fineQuota) - LEAVE_CONFIG.freeQuota
  );
  if (fineable <= 0) return 0;

  const existing = await prisma.fine.count({ where: { studentId, offeringId } });
  const toCreate = fineable - existing;
  if (toCreate <= 0) return 0;

  const rows = [];
  for (let i = 0; i < toCreate; i++) {
    rows.push({
      studentId,
      offeringId,
      reason: `Absent over ${LEAVE_CONFIG.freeQuota}-leave free quota`,
      amount: LEAVE_CONFIG.finePerAbsent,
    });
  }
  await prisma.fine.createMany({ data: rows });

  // Notify student
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } });
  if (student) {
    notify({
      userId: student.userId,
      type: 'FINE_ISSUED',
      title: `Fine issued: PKR ${LEAVE_CONFIG.finePerAbsent * toCreate}`,
      body: `You have crossed your free leave quota for one of your courses.`,
      linkUrl: '/student/leave-status',
    });
  }
  return toCreate;
};

// Trigger drop-off if counter goes above fineQuota.
const triggerDropOff = async ({ studentId, offeringId, counter, performedById }) => {
  if (!counter.dropOff) return false;

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_offeringId: { studentId, offeringId } },
  });
  if (!enrollment || enrollment.status !== 'ENROLLED') return false;

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status: 'DROPPED', droppedAt: new Date() },
  });

  // Notify student
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true, user: { select: { name: true } } },
  });
  if (student) {
    notify({
      userId: student.userId,
      type: 'COURSE_DROPPED',
      title: 'Course dropped due to attendance',
      body: 'You have exceeded the maximum allowed absences for one of your courses.',
      linkUrl: '/student/leave-status',
    });
  }

  // Audit log
  AuditLogger.log({
    action: 'DROP_ENROLLMENT_AUTO',
    category: 'ENROLLMENT',
    performedBy: performedById || 'system',
    performedByRole: 'system',
    targetModel: 'Enrollment',
    targetId: enrollment.id,
    description: `Auto-dropped due to leave-quota threshold (n=${counter.n})`,
  });

  return true;
};

// ─── STUDENT ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/leave/my  — student's leave-status grouped per enrolled offering
export const getMyLeaveStatus = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(403).json({ success: false, message: 'Student profile not found' });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ENROLLED' },
      include: {
        offering: {
          include: {
            course: { select: { code: true, title: true, creditHours: true } },
            term: { select: { code: true, academicYear: true } },
            teacher: { select: { user: { select: { name: true } } } },
          },
        },
      },
    });

    const courses = await Promise.all(
      enrollments.map(async (e) => {
        const counter = await computeCounter({ studentId: student.id, offeringId: e.offeringId });
        const applications = await prisma.leaveApplication.findMany({
          where: { studentId: student.id, offeringId: e.offeringId },
          orderBy: { createdAt: 'desc' },
        });
        const fines = await prisma.fine.findMany({
          where: { studentId: student.id, offeringId: e.offeringId },
          orderBy: { createdAt: 'desc' },
        });
        return { enrollment: e, counter, applications, fines };
      })
    );

    res.json({ success: true, config: LEAVE_CONFIG, data: courses });
  } catch (err) {
    console.error('[leave] my error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave/my/fines  — flat list of student's fines
export const getMyFines = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(403).json({ success: false, message: 'Student profile not found' });

    const fines = await prisma.fine.findMany({
      where: { studentId: student.id },
      include: {
        offering: { include: { course: { select: { code: true, title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalUnpaid = fines
      .filter((f) => f.status === 'UNPAID')
      .reduce((s, f) => s + f.amount, 0);

    res.json({ success: true, totalUnpaid, count: fines.length, data: fines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/leave/applications — student submits leave application
export const submitLeaveApplication = async (req, res) => {
  try {
    const { offeringId, fromDate, toDate, reason, attachmentUrl } = req.body;
    if (!offeringId || !fromDate || !toDate || !reason) {
      return res.status(400).json({ success: false, message: 'offeringId, fromDate, toDate, reason are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return res.status(400).json({ success: false, message: 'dates must be YYYY-MM-DD' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ success: false, message: 'fromDate must be <= toDate' });
    }

    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(403).json({ success: false, message: 'Student profile not found' });

    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_offeringId: { studentId: student.id, offeringId } },
    });
    if (!enrollment || enrollment.status !== 'ENROLLED') {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this offering' });
    }

    const application = await prisma.leaveApplication.create({
      data: { studentId: student.id, offeringId, fromDate, toDate, reason, attachmentUrl },
    });

    // Notify teacher
    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        teacher: { select: { user: { select: { id: true, name: true } } } },
        course: { select: { code: true } },
      },
    });
    if (offering?.teacher?.user?.id) {
      notify({
        userId: offering.teacher.user.id,
        type: 'LEAVE_APPLICATION',
        title: `Leave application: ${offering.course.code}`,
        body: `${req.user.name} requested leave from ${fromDate} to ${toDate}.`,
        linkUrl: `/teacher/leave-applications`,
        metadata: { applicationId: application.id, offeringId },
      });
    }

    res.status(201).json({ success: true, data: application });
  } catch (err) {
    console.error('[leave] submit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave/applications/:id — details (student or teacher)
export const getApplication = async (req, res) => {
  try {
    const application = await prisma.leaveApplication.findUnique({
      where: { id: req.params.id },
      include: {
        student: { include: { user: { select: { name: true, email: true } } } },
        offering: {
          include: {
            course: { select: { code: true, title: true } },
            teacher: { select: { userId: true, user: { select: { name: true } } } },
          },
        },
      },
    });
    if (!application) return res.status(404).json({ success: false, message: 'Not found' });

    const isOwner = application.student.userId === req.user.id;
    const isTeacher = application.offering.teacher.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isTeacher && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TEACHER ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/leave/offering/:offeringId — teacher view (counters + applications)
export const getOfferingLeaveStatus = async (req, res) => {
  try {
    const { offeringId } = req.params;

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher?.id } });
      if (!offering) return res.status(403).json({ success: false, message: 'Not your offering' });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId, status: { in: ['ENROLLED', 'DROPPED'] } },
      include: {
        student: { select: { id: true, studentId: true, batch: true, user: { select: { name: true } } } },
      },
      orderBy: { student: { studentId: 'asc' } },
    });

    const rows = await Promise.all(
      enrollments.map(async (e) => {
        const counter = await computeCounter({ studentId: e.studentId, offeringId });
        return { student: e.student, enrollmentStatus: e.status, counter };
      })
    );

    const applications = await prisma.leaveApplication.findMany({
      where: { offeringId },
      include: {
        student: { select: { studentId: true, user: { select: { name: true } } } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, config: LEAVE_CONFIG, data: { rows, applications } });
  } catch (err) {
    console.error('[leave] offering error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave/applications/teacher/pending — all pending applications for this teacher's offerings
export const getPendingForTeacher = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.status(403).json({ success: false, message: 'Teacher profile not found' });

    const applications = await prisma.leaveApplication.findMany({
      where: { offering: { teacherId: teacher.id } },
      include: {
        student: { select: { studentId: true, user: { select: { name: true } } } },
        offering: { include: { course: { select: { code: true, title: true } } } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, count: applications.length, data: applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const decideApplication = async (req, res, decision) => {
  try {
    const { reviewNotes } = req.body || {};
    const application = await prisma.leaveApplication.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { id: true, userId: true } },
        offering: { include: { course: { select: { code: true } } } },
      },
    });
    if (!application) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher || application.offering.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: 'Not your offering' });
      }
    }

    if (application.status !== 'PENDING') {
      return res.status(409).json({ success: false, message: `Already ${application.status.toLowerCase()}` });
    }

    const updated = await prisma.leaveApplication.update({
      where: { id: application.id },
      data: {
        status: decision,
        reviewedBy: req.user.id,
        reviewNotes: reviewNotes || null,
        reviewedAt: new Date(),
      },
    });

    // Notify student
    notify({
      userId: application.student.userId,
      type: 'LEAVE_DECISION',
      title: `Leave ${decision === 'APPROVED' ? 'approved' : 'rejected'}: ${application.offering.course.code}`,
      body: reviewNotes || `Your leave application has been ${decision.toLowerCase()}.`,
      linkUrl: '/student/leave-status',
      metadata: { applicationId: application.id },
    });

    // Re-evaluate counter on rejection (now counts as absent if there was attendance) and approval
    const counter = await computeCounter({
      studentId: application.studentId,
      offeringId: application.offeringId,
    });
    await generateFines({
      studentId: application.studentId,
      offeringId: application.offeringId,
      counter,
    });
    await triggerDropOff({
      studentId: application.studentId,
      offeringId: application.offeringId,
      counter,
      performedById: req.user.id,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[leave] decide error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const approveApplication = (req, res) => decideApplication(req, res, 'APPROVED');
export const rejectApplication = (req, res) => decideApplication(req, res, 'REJECTED');

// ─── HOOK: called from attendanceController after marking — re-evaluate counters ───
// Exported so attendanceController can call it as a fire-and-forget after upsert.
export const reevaluateAfterAttendance = async ({ offeringId, studentIds, performedById }) => {
  try {
    for (const studentId of studentIds) {
      const counter = await computeCounter({ studentId, offeringId });
      await generateFines({ studentId, offeringId, counter });
      await triggerDropOff({ studentId, offeringId, counter, performedById });
    }
  } catch (err) {
    console.error('[leave] reevaluate error:', err);
  }
};

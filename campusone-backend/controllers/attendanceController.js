import prisma from '../prisma/client.js';
import { reevaluateAfterAttendance } from './leaveController.js';
import { assertDateWithinTerm, parseDateOnly, toDateOnlyString } from '../utils/dateOnly.js';
import { findHolidayForDate } from '../utils/holidayRules.js';
import { isExcusedAbsence, summarizeAttendanceRecords } from '../utils/attendanceSummary.js';
import { getAttendancePolicy } from '../utils/attendancePolicy.js';

const VALID_ATTENDANCE_STATUSES = new Set(['PRESENT', 'ABSENT', 'LATE']);
const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const getTimetableMatch = async (offeringId, dateValue) => {
  const dayOfWeek = DAY_CODES[dateValue.getUTCDay()];
  const sessions = await prisma.classSession.findMany({
    where: { offeringId, dayOfWeek },
    include: { room: { select: { code: true } } },
    orderBy: { slotIndex: 'asc' },
  });
  return { dayOfWeek, sessions };
};

// Allow teacher of offering, admin, or APPROVED TA (with optional permission gate).
const assertCanViewOffering = async (user, offeringId, requiredTAPermission = 'VIEW_ROSTER') => {
  if (user.role === 'admin') return true;
  if (user.role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
    const offering = teacher
      ? await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher.id } })
      : null;
    return !!offering;
  }
  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    if (!student) return false;
    const ta = await prisma.tAAssignment.findUnique({
      where: { studentId_offeringId: { studentId: student.id, offeringId } },
    });
    return !!(ta && ta.status === 'APPROVED' && ta.permissions.includes(requiredTAPermission));
  }
  return false;
};

// ─── TEACHER ENDPOINTS ────────────────────────────────────────────────────────

// POST /api/attendance
// Body: { offeringId, date, records: [{ studentId, status }] }
// Authorised for: teacher of the offering, admin, or an APPROVED TA with MARK_ATTENDANCE.
export const markAttendance = async (req, res) => {
  try {
    const { offeringId, date, records } = req.body;
    if (!offeringId || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'offeringId, date, and records[] are required' });
    }
    const dateValue = parseDateOnly(date);
    if (!dateValue) {
      return res.status(400).json({ success: false, message: 'date must be a real calendar date in YYYY-MM-DD format' });
    }
    if (records.some((record) => !VALID_ATTENDANCE_STATUSES.has(record.status))) {
      return res.status(400).json({ success: false, message: 'status must be one of: PRESENT, ABSENT, LATE' });
    }

    let markerId; // string used for `markedBy` (teacher.id, ta student.id, or user.id for admin)
    const offeringWithTerm = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: { term: true },
    });
    if (!offeringWithTerm) return res.status(404).json({ success: false, message: 'Offering not found' });
    if (!assertDateWithinTerm(date, offeringWithTerm.term)) {
      const start = toDateOnlyString(offeringWithTerm.term.startDate);
      const end = toDateOnlyString(offeringWithTerm.term.endDate);
      return res.status(400).json({ success: false, message: `attendance date must be within term bounds (${start} to ${end})` });
    }

    const holiday = await findHolidayForDate({
      dateString: date,
      dateValue,
      termId: offeringWithTerm.termId,
    });
    if (holiday) {
      return res.status(400).json({
        success: false,
        message: `${toDateOnlyString(dateValue)} is a holiday (${holiday.name}). Attendance cannot be marked on holidays.`,
      });
    }

    const timetable = await getTimetableMatch(offeringId, dateValue);
    if (!timetable.sessions.length) {
      return res.status(400).json({
        success: false,
        message: `No scheduled lecture for this offering on ${timetable.dayOfWeek}. Attendance must match the timetable.`,
      });
    }

    const lecture = await prisma.lecture.findFirst({
      where: { offeringId, date: dateValue },
      select: { id: true },
    });
    if (!lecture) {
      return res.status(409).json({
        success: false,
        message: `Create a lecture for ${toDateOnlyString(dateValue)} before marking attendance.`,
      });
    }

    if (req.user.role === 'admin') {
      markerId = req.user.id;
    } else if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) return res.status(403).json({ success: false, message: 'Teacher profile not found' });
      const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher.id } });
      if (!offering) return res.status(403).json({ success: false, message: 'Not your offering' });
      markerId = teacher.id;
    } else if (req.user.role === 'student') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) return res.status(403).json({ success: false, message: 'Not authorised' });
      const ta = await prisma.tAAssignment.findUnique({
        where: { studentId_offeringId: { studentId: student.id, offeringId } },
      });
      if (!ta || ta.status !== 'APPROVED' || !ta.permissions.includes('MARK_ATTENDANCE')) {
        return res.status(403).json({ success: false, message: 'TA permission required: MARK_ATTENDANCE' });
      }
      markerId = student.id;
    } else {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }

    await Promise.all(records.map(({ studentId, status }) =>
      prisma.attendance.upsert({
        where: { offeringId_studentId_date: { offeringId, studentId, date: dateValue } },
        create: { offeringId, studentId, date: dateValue, status, markedBy: markerId },
        update: { status, markedBy: markerId },
      })
    ));

    await reevaluateAfterAttendance({
      offeringId,
      studentIds: records.map((r) => r.studentId),
      performedById: req.user.id,
    });

    res.json({ success: true, count: records.length, message: `Attendance saved for ${records.length} students` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance/offering/:offeringId/sessions
export const getSessions = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const allowed = await assertCanViewOffering(req.user, offeringId, 'VIEW_ROSTER');
    if (!allowed) return res.status(403).json({ success: false, message: 'Not authorised for this offering' });

    // Group by date + status using Prisma groupBy
    const grouped = await prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: { offeringId },
      _count: { _all: true },
      orderBy: { date: 'desc' },
    });

    const sessions = {};
    for (const row of grouped) {
      const dateKey = toDateOnlyString(row.date);
      if (!sessions[dateKey]) sessions[dateKey] = { date: dateKey, present: 0, absent: 0, late: 0, total: 0 };
      sessions[dateKey][row.status.toLowerCase()] = row._count._all;
      sessions[dateKey].total += row._count._all;
    }

    res.json({ success: true, data: Object.values(sessions).sort((a, b) => b.date.localeCompare(a.date)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance/offering/:offeringId/sessions/:date
export const getSessionDetail = async (req, res) => {
  try {
    const { offeringId, date } = req.params;

    const allowed = await assertCanViewOffering(req.user, offeringId, 'VIEW_ROSTER');
    if (!allowed) return res.status(403).json({ success: false, message: 'Not authorised for this offering' });

    const dateValue = parseDateOnly(date);
    if (!dateValue) {
      return res.status(400).json({ success: false, message: 'date must be a real calendar date in YYYY-MM-DD format' });
    }

    const records = await prisma.attendance.findMany({
      where: { offeringId, date: dateValue },
      include: {
        student: { select: { id: true, studentId: true, user: { select: { name: true } } } },
      },
      orderBy: { student: { studentId: 'asc' } },
    });

    res.json({ success: true, data: records.map((record) => ({ ...record, date: toDateOnlyString(record.date) })) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance/offering/:offeringId/students
export const getStudentSummary = async (req, res) => {
  try {
    const { offeringId } = req.params;

    const allowed = await assertCanViewOffering(req.user, offeringId, 'VIEW_ROSTER');
    if (!allowed) return res.status(403).json({ success: false, message: 'Not authorised for this offering' });

    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId, status: { in: ['ENROLLED', 'COMPLETED'] } },
      include: { student: { select: { id: true, studentId: true, user: { select: { name: true } } } } },
    });

    const [allAttendance, approvedApplications] = await Promise.all([
      prisma.attendance.findMany({ where: { offeringId } }),
      prisma.leaveApplication.findMany({
        where: { offeringId, status: 'APPROVED' },
        select: { studentId: true, fromDate: true, toDate: true },
      }),
    ]);
    const policy = await getAttendancePolicy();
    const uniqueDates = [...new Set(allAttendance.map(a => toDateOnlyString(a.date)))];
    const totalSessions = uniqueDates.length;
    const approvedByStudent = new Map();
    for (const application of approvedApplications) {
      if (!approvedByStudent.has(application.studentId)) approvedByStudent.set(application.studentId, []);
      approvedByStudent.get(application.studentId).push(application);
    }

    const summary = enrollments.map(({ student }) => {
      const records = allAttendance.filter(a => a.studentId === student.id);
      const attendance = summarizeAttendanceRecords({
        records,
        approvedApplications: approvedByStudent.get(student.id) || [],
        totalSessions,
        emptyPercentage: 100,
        excusedAbsenceReducesTotal: policy.excusedAbsenceReducesTotal,
      });
      const data = { ...attendance };
      delete data.approvedDates;
      return { student, ...data, isAtRisk: data.percentage < 75 };
    });

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── STUDENT ENDPOINT ─────────────────────────────────────────────────────────

// GET /api/attendance/my
export const getMyAttendance = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: { in: ['ENROLLED', 'COMPLETED'] } },
      include: {
        offering: {
          include: {
            course:  { select: { code: true, title: true } },
            term:    { select: { code: true, season: true, academicYear: true } },
            teacher: { select: { user: { select: { name: true } } } },
          },
        },
      },
    });

    if (!enrollments.length) return res.json({ success: true, data: [] });

    const offeringIds = enrollments.map(e => e.offeringId);

    // Fetch all attendance in two queries (no N+1)
    const [myRecords, allSessions, approvedApplications] = await Promise.all([
      prisma.attendance.findMany({
        where: { offeringId: { in: offeringIds }, studentId: student.id },
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.findMany({
        where: { offeringId: { in: offeringIds } },
        select: { offeringId: true, date: true },
        distinct: ['offeringId', 'date'],
      }),
      prisma.leaveApplication.findMany({
        where: { offeringId: { in: offeringIds }, studentId: student.id, status: 'APPROVED' },
        select: { offeringId: true, fromDate: true, toDate: true },
      }),
    ]);
    const policy = await getAttendancePolicy();
    const approvedByOffering = new Map();
    for (const application of approvedApplications) {
      if (!approvedByOffering.has(application.offeringId)) approvedByOffering.set(application.offeringId, []);
      approvedByOffering.get(application.offeringId).push(application);
    }

    const result = enrollments.map(({ offering }) => {
      const records       = myRecords.filter(r => r.offeringId === offering.id);
      const totalSessions = allSessions.filter(s => s.offeringId === offering.id).length;
      const attendance = summarizeAttendanceRecords({
        records,
        approvedApplications: approvedByOffering.get(offering.id) || [],
        totalSessions,
        emptyPercentage: 100,
        excusedAbsenceReducesTotal: policy.excusedAbsenceReducesTotal,
      });
      const { approvedDates, ...summary } = attendance;

      return {
        offering: {
          id:      offering.id,
          section: offering.section,
          course:  offering.course,
          term:    offering.term,
          teacher: offering.teacher.user.name,
        },
        ...summary,
        isAtRisk: summary.percentage < 75,
        records: records.slice(0, 20).map((record) => ({
          ...record,
          date: toDateOnlyString(record.date),
          isExcused: isExcusedAbsence(record, approvedDates),
        })),
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

import prisma from '../prisma/client.js';

const GRADE_POINTS = {
  A_PLUS: 4.0, A: 4.0, A_MINUS: 3.67,
  B_PLUS: 3.33, B: 3.0, B_MINUS: 2.67,
  C_PLUS: 2.33, C: 2.0, C_MINUS: 1.67,
  D_PLUS: 1.33, D: 1.0,
  F: 0.0, I: null, W: null,
};

const PROGRAM_COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#f97316'];

const gpToLetter = (gp) => {
  if (gp == null) return '—';
  if (gp >= 3.85) return 'A';
  if (gp >= 3.5)  return 'A-';
  if (gp >= 3.15) return 'B+';
  if (gp >= 2.85) return 'B';
  if (gp >= 2.5)  return 'B-';
  if (gp >= 2.15) return 'C+';
  if (gp >= 1.85) return 'C';
  if (gp >= 1.5)  return 'C-';
  if (gp >= 1.15) return 'D+';
  if (gp >= 0.5)  return 'D';
  return 'F';
};

// GET /api/reports/overview — top-level KPIs
export const getOverview = async (req, res) => {
  try {
    const [totalStudents, activeOfferings, completed, allProgs] = await Promise.all([
      prisma.student.count(),
      prisma.courseOffering.count({ where: { isActive: true } }),
      prisma.enrollment.findMany({
        where: { status: 'COMPLETED', gradePoints: { not: null } },
        select: { gradePoints: true },
      }),
      prisma.program.findMany({ select: { id: true, totalCredits: true } }),
    ]);

    const avgCGPA = completed.length
      ? +(completed.reduce((s, e) => s + e.gradePoints, 0) / completed.length).toFixed(2)
      : null;

    // Graduation rate proxy: students who have completed >= totalCredits worth of courses
    const programCredits = Object.fromEntries(allProgs.map((p) => [p.id, p.totalCredits]));
    const allStudents = await prisma.student.findMany({
      select: {
        id: true, programId: true,
        enrollments: {
          where: { status: 'COMPLETED' },
          select: { offering: { select: { course: { select: { creditHours: true } } } } },
        },
      },
    });
    let graduated = 0;
    for (const s of allStudents) {
      const earned = s.enrollments.reduce((x, e) => x + (e.offering.course.creditHours || 0), 0);
      if (programCredits[s.programId] && earned >= programCredits[s.programId]) graduated++;
    }
    const gradRate = allStudents.length ? Math.round((graduated / allStudents.length) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalStudents,
        activeOfferings,
        avgCGPA,
        graduationRate: gradRate,
      },
    });
  } catch (err) {
    console.error('[reports] overview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/enrollment-by-program
export const getEnrollmentByProgram = async (req, res) => {
  try {
    const programs = await prisma.program.findMany({
      where: { isActive: true },
      select: {
        id: true, programCode: true, name: true,
        _count: { select: { students: true } },
      },
      orderBy: { programCode: 'asc' },
    });

    // capacity = sum of department/program capacity heuristic: 50/section × 8 sections = 400
    const data = programs.map((p, i) => ({
      id: p.id,
      code: p.programCode,
      program: p.name,
      students: p._count.students,
      capacity: Math.max(p._count.students, 100), // simple proxy when no explicit capacity model
      color: PROGRAM_COLORS[i % PROGRAM_COLORS.length],
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[reports] enrollment-by-program error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/grade-distribution?termId=
export const getGradeDistribution = async (req, res) => {
  try {
    const { termId } = req.query;
    const where = { gradeLetter: { not: null } };
    if (termId) where.offering = { termId };

    const grouped = await prisma.enrollment.groupBy({
      by: ['gradeLetter'],
      where,
      _count: { _all: true },
    });

    const order = ['A_PLUS', 'A', 'A_MINUS', 'B_PLUS', 'B', 'B_MINUS', 'C_PLUS', 'C', 'C_MINUS', 'D_PLUS', 'D', 'F', 'I', 'W'];
    const labels = {
      A_PLUS: 'A+', A: 'A', A_MINUS: 'A-',
      B_PLUS: 'B+', B: 'B', B_MINUS: 'B-',
      C_PLUS: 'C+', C: 'C', C_MINUS: 'C-',
      D_PLUS: 'D+', D: 'D', F: 'F', I: 'I', W: 'W',
    };
    const data = order.map((g) => ({
      grade: labels[g],
      count: grouped.find((x) => x.gradeLetter === g)?._count._all || 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[reports] grade-distribution error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/course-performance?termId=&limit=
export const getCoursePerformance = async (req, res) => {
  try {
    const { termId } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);

    const offerings = await prisma.courseOffering.findMany({
      where: termId ? { termId } : { isActive: true },
      include: {
        course: { select: { code: true, title: true } },
        term: { select: { code: true } },
        enrollments: {
          select: { gradeLetter: true, gradePoints: true, status: true },
        },
      },
    });

    const rows = offerings
      .map((o) => {
        const enrolled = o.enrollments.length;
        const graded = o.enrollments.filter((e) => e.gradePoints != null);
        const passes = o.enrollments.filter(
          (e) => e.gradeLetter && !['F', 'I', 'W'].includes(e.gradeLetter)
        ).length;
        const avgGp = graded.length
          ? graded.reduce((s, e) => s + e.gradePoints, 0) / graded.length
          : null;
        return {
          offeringId: o.id,
          course: `${o.course.code} - ${o.course.title}`,
          section: o.section,
          term: o.term.code,
          enrolled,
          avgGrade: gpToLetter(avgGp),
          passRate: enrolled ? Math.round((passes / enrolled) * 100) : 0,
        };
      })
      .filter((r) => r.enrolled > 0)
      .sort((a, b) => b.enrolled - a.enrolled)
      .slice(0, limit);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[reports] course-performance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/term-trends — per-term enrolled / graded / avg gpa
export const getTermTrends = async (req, res) => {
  try {
    const terms = await prisma.term.findMany({
      orderBy: [{ academicYear: 'asc' }, { season: 'asc' }],
      select: {
        id: true, code: true, academicYear: true, season: true, isActive: true,
      },
    });

    const data = await Promise.all(
      terms.map(async (t) => {
        const enrollments = await prisma.enrollment.findMany({
          where: { offering: { termId: t.id } },
          select: { gradePoints: true, status: true },
        });
        const enrolled = enrollments.length;
        const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
        const graded = enrollments.filter((e) => e.gradePoints != null);
        const avgGpa = graded.length
          ? +(graded.reduce((s, e) => s + e.gradePoints, 0) / graded.length).toFixed(2)
          : null;
        return {
          term: `${t.season} ${t.academicYear.split('-')[0]}`,
          code: t.code,
          enrolled,
          completed: t.isActive ? null : completed,
          gpa: t.isActive ? null : avgGpa,
        };
      })
    );

    res.json({ success: true, data });
  } catch (err) {
    console.error('[reports] term-trends error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/admission-funnel — admissions grouped by month
export const getAdmissionFunnel = async (req, res) => {
  try {
    const apps = await prisma.admissionApplication.findMany({
      select: { applicationStatus: true, applicationDate: true },
      orderBy: { applicationDate: 'asc' },
    });

    const months = {};
    for (const a of apps) {
      const d = new Date(a.applicationDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { key, applied: 0, accepted: 0, enrolled: 0 };
      months[key].applied++;
      if (['Accepted', 'Enrolled', 'Approved'].includes(a.applicationStatus)) months[key].accepted++;
      if (a.applicationStatus === 'Enrolled') months[key].enrolled++;
    }

    const data = Object.values(months)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6)
      .map((m) => {
        const [y, mn] = m.key.split('-');
        const monthName = new Date(+y, +mn - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
        return { month: monthName, applied: m.applied, accepted: m.accepted, enrolled: m.enrolled };
      });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[reports] admission-funnel error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/attendance-summary?termId=
export const getAttendanceSummary = async (req, res) => {
  try {
    const { termId } = req.query;
    const where = {};
    if (termId) where.offering = { termId };

    const grouped = await prisma.attendance.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    const summary = { PRESENT: 0, ABSENT: 0, LATE: 0 };
    for (const g of grouped) summary[g.status] = g._count._all;
    const total = summary.PRESENT + summary.ABSENT + summary.LATE;
    const presentRate = total ? Math.round((summary.PRESENT / total) * 100) : 0;

    res.json({
      success: true,
      data: { ...summary, total, presentRate },
    });
  } catch (err) {
    console.error('[reports] attendance-summary error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

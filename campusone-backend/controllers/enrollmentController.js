import prisma from '../prisma/client.js';

// Grade point map for CGPA calculation
const GRADE_POINTS = {
  A_PLUS: 4.0, A: 4.0, A_MINUS: 3.67,
  B_PLUS: 3.33, B: 3.0, B_MINUS: 2.67,
  C_PLUS: 2.33, C: 2.0, C_MINUS: 1.67,
  D_PLUS: 1.33, D: 1.0,
  F: 0.0, I: null, W: null,
};

const computeCGPA = (enrollments) => {
  const countable = enrollments.filter((e) => e.gradePoints !== null && e.gradePoints !== undefined);
  if (!countable.length) return null;
  const totalPoints = countable.reduce((s, e) => s + e.gradePoints * (e.offering?.course?.creditHours ?? 0), 0);
  const totalCredits = countable.reduce((s, e) => s + (e.offering?.course?.creditHours ?? 0), 0);
  return totalCredits ? +(totalPoints / totalCredits).toFixed(2) : null;
};

// GET /api/enrollments?offeringId=&studentId=&status=
export const getEnrollments = async (req, res) => {
  try {
    const { offeringId, studentId, status } = req.query;
    const where = {};
    if (offeringId) where.offeringId = offeringId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: { select: { id: true, studentId: true, user: { select: { name: true } } } },
        offering: {
          select: {
            id: true, section: true,
            course: { select: { code: true, title: true, creditHours: true } },
            term: { select: { code: true, academicYear: true } },
            teacher: { select: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
    res.json({ success: true, count: enrollments.length, data: enrollments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/enrollments/:id
export const getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: req.params.id },
      include: {
        student: { include: { user: { select: { name: true, email: true } } } },
        offering: {
          include: {
            course: true,
            term: true,
            teacher: { select: { id: true, user: { select: { name: true } } } },
          },
        },
      },
    });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    res.json({ success: true, data: enrollment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/enrollments  — enroll a student in an offering
export const enrollStudent = async (req, res) => {
  try {
    const { studentId, offeringId } = req.body;
    if (!studentId || !offeringId) return res.status(400).json({ success: false, message: 'studentId and offeringId are required' });

    // Check offering exists and has capacity
    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        course: { include: { prerequisites: { select: { id: true, code: true } } } },
        _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } },
      },
    });
    if (!offering || !offering.isActive) return res.status(404).json({ success: false, message: 'Offering not found or inactive' });

    if (offering._count.enrollments >= offering.capacity) {
      return res.status(409).json({ success: false, message: 'Offering is at full capacity' });
    }

    // Check not already enrolled
    const existing = await prisma.enrollment.findUnique({ where: { studentId_offeringId: { studentId, offeringId } } });
    if (existing && existing.status === 'ENROLLED') {
      return res.status(409).json({ success: false, message: 'Student is already enrolled in this offering' });
    }

    // Prerequisite check
    if (offering.course.prerequisites.length > 0) {
      const completedCourseIds = await prisma.enrollment.findMany({
        where: { studentId, status: 'COMPLETED' },
        select: { offering: { select: { courseId: true } } },
      }).then((e) => e.map((x) => x.offering.courseId));

      const missing = offering.course.prerequisites.filter((p) => !completedCourseIds.includes(p.id));
      if (missing.length > 0) {
        return res.status(422).json({
          success: false,
          message: 'Prerequisites not satisfied',
          missing: missing.map((p) => p.code),
        });
      }
    }

    // Upsert: if dropped before, re-enroll; otherwise create
    let enrollment;
    if (existing) {
      enrollment = await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: 'ENROLLED', droppedAt: null, enrolledAt: new Date() },
      });
    } else {
      enrollment = await prisma.enrollment.create({ data: { studentId, offeringId } });
    }

    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/enrollments/:id  — drop enrollment
export const dropEnrollment = async (req, res) => {
  try {
    const enrollment = await prisma.enrollment.findUnique({ where: { id: req.params.id } });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
    if (enrollment.status !== 'ENROLLED') {
      return res.status(409).json({ success: false, message: 'Only active enrollments can be dropped' });
    }

    await prisma.enrollment.update({
      where: { id: req.params.id },
      data: { status: 'DROPPED', droppedAt: new Date() },
    });
    res.json({ success: true, message: 'Enrollment dropped' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/enrollments/:id/grade  — teacher submits grade for one student
export const updateGrade = async (req, res) => {
  try {
    const { assignmentMarks, midMarks, finalMarks, totalMarks, gradeLetter } = req.body;

    // Verify the requesting teacher owns this offering
    if (req.user.role === 'teacher') {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: req.params.id },
        select: { offering: { select: { teacherId: true } } },
      });
      if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher || teacher.id !== enrollment.offering.teacherId) {
        return res.status(403).json({ success: false, message: 'You can only grade students in your own offerings' });
      }
    }

    const gradePoints = gradeLetter ? (GRADE_POINTS[gradeLetter] ?? null) : undefined;
    const status = gradeLetter
      ? gradeLetter === 'F' ? 'FAILED' : gradeLetter === 'I' ? 'INCOMPLETE' : gradeLetter === 'W' ? 'WITHDRAWN' : 'COMPLETED'
      : undefined;

    const updated = await prisma.enrollment.update({
      where: { id: req.params.id },
      data: {
        assignmentMarks: assignmentMarks !== undefined ? +assignmentMarks : undefined,
        midMarks: midMarks !== undefined ? +midMarks : undefined,
        finalMarks: finalMarks !== undefined ? +finalMarks : undefined,
        totalMarks: totalMarks !== undefined ? +totalMarks : undefined,
        gradeLetter,
        gradePoints: gradePoints !== undefined ? gradePoints : undefined,
        status: status || undefined,
        completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Enrollment not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/enrollments/bulk-grade  — teacher submits grades for all students in an offering
export const bulkGrade = async (req, res) => {
  try {
    const { offeringId, grades } = req.body;
    // grades: [{ enrollmentId, assignmentMarks, midMarks, finalMarks, totalMarks, gradeLetter }]
    if (!offeringId || !Array.isArray(grades)) {
      return res.status(400).json({ success: false, message: 'offeringId and grades[] are required' });
    }

    if (req.user.role === 'teacher') {
      const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!offering || !teacher || offering.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const updates = await Promise.all(
      grades.map(({ enrollmentId, assignmentMarks, midMarks, finalMarks, totalMarks, gradeLetter }) => {
        const gradePoints = gradeLetter ? (GRADE_POINTS[gradeLetter] ?? null) : undefined;
        const status = gradeLetter
          ? gradeLetter === 'F' ? 'FAILED' : gradeLetter === 'I' ? 'INCOMPLETE' : gradeLetter === 'W' ? 'WITHDRAWN' : 'COMPLETED'
          : undefined;
        return prisma.enrollment.update({
          where: { id: enrollmentId },
          data: {
            assignmentMarks: assignmentMarks !== undefined ? +assignmentMarks : undefined,
            midMarks: midMarks !== undefined ? +midMarks : undefined,
            finalMarks: finalMarks !== undefined ? +finalMarks : undefined,
            totalMarks: totalMarks !== undefined ? +totalMarks : undefined,
            gradeLetter,
            gradePoints: gradePoints !== undefined ? gradePoints : undefined,
            status: status || undefined,
            completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined,
          },
        });
      })
    );

    res.json({ success: true, count: updates.length, message: 'Grades submitted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/:studentId/transcript
export const getTranscript = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
      include: {
        user: { select: { name: true, email: true } },
        program: { select: { programCode: true, name: true, totalCredits: true } },
        curriculum: { select: { version: true } },
        department: { select: { name: true } },
      },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.params.studentId, status: { in: ['COMPLETED', 'FAILED', 'WITHDRAWN', 'INCOMPLETE'] } },
      include: {
        offering: {
          include: {
            course: { select: { code: true, title: true, creditHours: true } },
            term: { select: { code: true, season: true, academicYear: true } },
          },
        },
      },
      orderBy: { offering: { term: { academicYear: 'asc' } } },
    });

    // Group by term
    const termMap = {};
    for (const e of enrollments) {
      const termCode = e.offering.term.code;
      if (!termMap[termCode]) {
        termMap[termCode] = { term: e.offering.term, courses: [], termGPA: null };
      }
      termMap[termCode].courses.push({
        code: e.offering.course.code,
        title: e.offering.course.title,
        creditHours: e.offering.course.creditHours,
        gradeLetter: e.gradeLetter,
        gradePoints: e.gradePoints,
        totalMarks: e.totalMarks,
        status: e.status,
      });
    }

    // Compute per-term GPA
    const terms = Object.values(termMap).map((t) => {
      const countable = t.courses.filter((c) => c.gradePoints !== null && c.gradePoints !== undefined);
      const totalPts = countable.reduce((s, c) => s + c.gradePoints * c.creditHours, 0);
      const totalCr = countable.reduce((s, c) => s + c.creditHours, 0);
      t.termGPA = totalCr ? +(totalPts / totalCr).toFixed(2) : null;
      t.termCredits = totalCr;
      return t;
    });

    // CGPA
    const allCountable = enrollments.filter((e) => e.gradePoints !== null && e.gradePoints !== undefined);
    const totalPts = allCountable.reduce((s, e) => s + e.gradePoints * e.offering.course.creditHours, 0);
    const totalCr = allCountable.reduce((s, e) => s + e.offering.course.creditHours, 0);
    const cgpa = totalCr ? +(totalPts / totalCr).toFixed(2) : null;
    const completedCredits = enrollments
      .filter((e) => e.status === 'COMPLETED')
      .reduce((s, e) => s + e.offering.course.creditHours, 0);

    res.json({
      success: true,
      data: { student, terms, cgpa, completedCredits, totalRequiredCredits: student.program.totalCredits },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/:studentId/cgpa
export const getStudentCGPA = async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.params.studentId, status: 'COMPLETED' },
      include: { offering: { include: { course: { select: { creditHours: true } } } } },
    });

    const cgpa = computeCGPA(enrollments);
    const completedCredits = enrollments.reduce((s, e) => s + e.offering.course.creditHours, 0);
    res.json({ success: true, data: { cgpa, completedCredits, courseCount: enrollments.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/:studentId/current-enrollments
export const getCurrentEnrollments = async (req, res) => {
  try {
    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
    const where = { studentId: req.params.studentId, status: 'ENROLLED' };
    if (activeTerm) where.offering = { termId: activeTerm.id };

    const enrollments = await prisma.enrollment.findMany({
      where,
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
    res.json({ success: true, count: enrollments.length, data: enrollments, term: activeTerm });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

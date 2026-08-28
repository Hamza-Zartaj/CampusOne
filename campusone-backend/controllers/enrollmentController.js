import prisma from '../prisma/client.js';
import { createWorkbookBuffer, readFirstWorksheetRows } from '../utils/excelWorkbook.js';
import {
  computeGradePointAverage,
  enrollmentStatusForGrade,
  gradePointsForLetter,
  normalizeEnrollmentGrade,
} from '../utils/grading.js';
import { buildTranscriptData } from '../utils/transcript.js';
import { getGradingWindowError } from '../utils/gradingWindow.js';
import { runSerializableTransaction } from '../utils/prismaTransactions.js';

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

// PUT /api/enrollments/:id/transfer-section  — admin moves student to a different section of the same course/term
export const transferSection = async (req, res) => {
  try {
    const { newOfferingId } = req.body;
    if (!newOfferingId) return res.status(400).json({ success: false, message: 'newOfferingId is required' });

    const { updated, fromSection, toSection } = await runSerializableTransaction(prisma, async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id: req.params.id },
        include: {
          offering: { select: { id: true, courseId: true, termId: true, section: true } },
        },
      });
      if (!enrollment) {
        const error = new Error('Enrollment not found');
        error.statusCode = 404;
        throw error;
      }
      if (enrollment.status !== 'ENROLLED') {
        const error = new Error('Only active enrollments can be transferred');
        error.statusCode = 409;
        throw error;
      }
      if (enrollment.offeringId === newOfferingId) {
        const error = new Error('New offering must differ from current');
        error.statusCode = 400;
        throw error;
      }

      const target = await tx.courseOffering.findUnique({
        where: { id: newOfferingId },
      });
      if (!target || !target.isActive) {
        const error = new Error('Target offering not found or inactive');
        error.statusCode = 404;
        throw error;
      }
      if (target.courseId !== enrollment.offering.courseId || target.termId !== enrollment.offering.termId) {
        const error = new Error('Target offering must be the same course in the same term');
        error.statusCode = 400;
        throw error;
      }
      if (target.section === enrollment.offering.section) {
        const error = new Error('Target offering must be a different section');
        error.statusCode = 400;
        throw error;
      }

      const targetEnrollment = await tx.enrollment.findUnique({
        where: {
          studentId_offeringId: {
            studentId: enrollment.studentId,
            offeringId: newOfferingId,
          },
        },
      });
      if (targetEnrollment) {
        const error = new Error('Student already has an enrollment in target section');
        error.statusCode = 409;
        throw error;
      }

      const [
        targetEnrollmentCount,
        attendanceCount,
        submissionCount,
        quizAttemptCount,
        leaveCount,
        fineCount,
        markCount,
      ] = await Promise.all([
        tx.enrollment.count({ where: { offeringId: newOfferingId, status: 'ENROLLED' } }),
        tx.attendance.count({
          where: {
            studentId: enrollment.studentId,
            offeringId: { in: [enrollment.offeringId, newOfferingId] },
          },
        }),
        tx.submission.count({
          where: {
            studentId: enrollment.studentId,
            assignment: { offeringId: { in: [enrollment.offeringId, newOfferingId] } },
          },
        }),
        tx.quizAttempt.count({
          where: {
            studentId: enrollment.studentId,
            quiz: { offeringId: { in: [enrollment.offeringId, newOfferingId] } },
          },
        }),
        tx.leaveApplication.count({
          where: {
            studentId: enrollment.studentId,
            offeringId: { in: [enrollment.offeringId, newOfferingId] },
          },
        }),
        tx.fine.count({
          where: {
            studentId: enrollment.studentId,
            offeringId: { in: [enrollment.offeringId, newOfferingId] },
          },
        }),
        tx.markComponent.count({ where: { enrollmentId: enrollment.id } }),
      ]);

      if (targetEnrollmentCount >= target.capacity) {
        const error = new Error('Target section is at full capacity');
        error.statusCode = 409;
        throw error;
      }

      const legacyGradeStarted = [
        enrollment.assignmentMarks,
        enrollment.midMarks,
        enrollment.finalMarks,
        enrollment.totalMarks,
        enrollment.gradeLetter,
        enrollment.gradePoints,
      ].some((value) => value !== null);
      const blockers = {
        legacyGrades: legacyGradeStarted ? 1 : 0,
        attendance: attendanceCount,
        submissions: submissionCount,
        quizAttempts: quizAttemptCount,
        leaveApplications: leaveCount,
        fines: fineCount,
        markComponents: markCount,
      };
      if (Object.values(blockers).some((count) => count > 0)) {
        const error = new Error('Cannot transfer while section-specific academic activity exists in either section');
        error.statusCode = 409;
        error.details = blockers;
        throw error;
      }

      const transferred = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { offeringId: newOfferingId },
      });

      return {
        updated: transferred,
        fromSection: enrollment.offering.section,
        toSection: target.section,
      };
    });

    res.json({ success: true, data: updated, message: `Transferred from ${fromSection} to ${toSection}` });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      ...(err.details && { blockers: err.details }),
    });
  }
};

// PUT /api/enrollments/:id/grade  — teacher submits grade for one student
export const updateGrade = async (req, res) => {
  try {
    const { assignmentMarks, midMarks, finalMarks, totalMarks, gradeLetter } = req.body;
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: req.params.id },
      include: {
        offering: {
          select: {
            teacherId: true,
            term: { select: { code: true, isActive: true, endDate: true } },
          },
        },
      },
    });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });

    // Verify the requesting teacher owns this offering
    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher || teacher.id !== enrollment.offering.teacherId) {
        return res.status(403).json({ success: false, message: 'You can only grade students in your own offerings' });
      }
    }

    const gradingWindowError = getGradingWindowError(enrollment.offering.term);
    if (gradingWindowError) {
      return res.status(409).json({ success: false, code: 'GRADE_WINDOW_CLOSED', message: gradingWindowError });
    }

    const resolvedGradeLetter = normalizeEnrollmentGrade({ totalMarks, gradeLetter });
    const gradePoints = gradePointsForLetter(resolvedGradeLetter);
    const status = enrollmentStatusForGrade(resolvedGradeLetter);

    const updated = await prisma.enrollment.update({
      where: { id: req.params.id },
      data: {
        assignmentMarks: assignmentMarks !== undefined ? +assignmentMarks : undefined,
        midMarks: midMarks !== undefined ? +midMarks : undefined,
        finalMarks: finalMarks !== undefined ? +finalMarks : undefined,
        totalMarks: totalMarks !== undefined ? +totalMarks : undefined,
        gradeLetter: resolvedGradeLetter,
        gradePoints: gradePoints !== undefined ? gradePoints : undefined,
        status: status || undefined,
        completedAt: status ? (status === 'COMPLETED' || status === 'FAILED' ? new Date() : null) : undefined,
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

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: { term: { select: { code: true, isActive: true, endDate: true } } },
    });
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher || offering.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const gradingWindowError = getGradingWindowError(offering.term);
    if (gradingWindowError) {
      return res.status(409).json({ success: false, code: 'GRADE_WINDOW_CLOSED', message: gradingWindowError });
    }

    const enrollmentIds = grades.map((grade) => grade.enrollmentId).filter(Boolean);
    const matchingEnrollmentCount = await prisma.enrollment.count({
      where: { id: { in: enrollmentIds }, offeringId },
    });
    if (matchingEnrollmentCount !== enrollmentIds.length) {
      return res.status(400).json({ success: false, message: 'Every grade row must belong to the selected offering' });
    }

    const updates = await prisma.$transaction(
      grades.map(({ enrollmentId, assignmentMarks, midMarks, finalMarks, totalMarks, gradeLetter }) => {
        const resolvedGradeLetter = normalizeEnrollmentGrade({ totalMarks, gradeLetter });
        const gradePoints = gradePointsForLetter(resolvedGradeLetter);
        const status = enrollmentStatusForGrade(resolvedGradeLetter);
        return prisma.enrollment.update({
          where: { id: enrollmentId },
          data: {
            assignmentMarks: assignmentMarks !== undefined ? +assignmentMarks : undefined,
            midMarks: midMarks !== undefined ? +midMarks : undefined,
            finalMarks: finalMarks !== undefined ? +finalMarks : undefined,
            totalMarks: totalMarks !== undefined ? +totalMarks : undefined,
            gradeLetter: resolvedGradeLetter,
            gradePoints: gradePoints !== undefined ? gradePoints : undefined,
            status: status || undefined,
            completedAt: status ? (status === 'COMPLETED' || status === 'FAILED' ? new Date() : null) : undefined,
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
    const transcript = await buildTranscriptData(req.params.studentId);
    if (!transcript) return res.status(404).json({ success: false, message: 'Student not found' });

    res.json({ success: true, data: transcript });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/students/:studentId/cgpa
export const getStudentCGPA = async (req, res) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.params.studentId, gradePoints: { not: null } },
      include: { offering: { include: { course: { select: { creditHours: true } } } } },
    });

    const cgpa = computeGradePointAverage(enrollments, (enrollment) => enrollment.offering.course.creditHours);
    const completedCredits = enrollments
      .filter((enrollment) => enrollment.status === 'COMPLETED')
      .reduce((sum, enrollment) => sum + enrollment.offering.course.creditHours, 0);
    res.json({ success: true, data: { cgpa, completedCredits, courseCount: enrollments.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/enrollments/bulk-import/template — admin downloads XLSX template
export const bulkImportTemplate = async (_req, res) => {
  try {
    const buf = await createWorkbookBuffer([
      {
        name: 'Enrollments',
        rows: [
          { studentId: 'CS-2023-001' },
          { studentId: 'CS-2023-002' },
        ],
        header: ['studentId'],
        columns: [{ wch: 18 }],
        freezeHeader: true,
      },
    ]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=enrollment_bulk_template.xlsx');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/enrollments/bulk-import — admin uploads XLSX with `studentId` column for one offering
export const bulkImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const offeringId = req.body.offeringId;
    if (!offeringId) return res.status(400).json({ success: false, message: 'offeringId is required' });

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        course: { include: { prerequisites: { select: { id: true } } } },
        _count: { select: { enrollments: { where: { status: 'ENROLLED' } } } },
      },
    });
    if (!offering || !offering.isActive) {
      return res.status(404).json({ success: false, message: 'Offering not found or inactive' });
    }
    const remainingCapacity = offering.capacity - offering._count.enrollments;

    const rows = await readFirstWorksheetRows(req.file.buffer);

    const studentIds = rows.map((r) => String(r.studentId || r.StudentID || '').trim()).filter(Boolean);
    if (studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No studentId rows found' });
    }

    const students = await prisma.student.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true, studentId: true },
    });
    const byCode = new Map(students.map((s) => [s.studentId, s.id]));

    const existing = await prisma.enrollment.findMany({
      where: { offeringId, studentId: { in: students.map((s) => s.id) } },
      select: { studentId: true, status: true },
    });
    const existingMap = new Map(existing.map((e) => [e.studentId, e.status]));

    const prereqIds = offering.course.prerequisites.map((p) => p.id);

    const results = { enrolled: 0, skipped: 0, errors: [] };
    let willAdd = 0;
    for (const code of studentIds) {
      const sid = byCode.get(code);
      if (!sid) { results.errors.push({ studentId: code, reason: 'Student not found' }); continue; }
      const status = existingMap.get(sid);
      if (status === 'ENROLLED') { results.skipped++; continue; }
      if (willAdd >= remainingCapacity) {
        results.errors.push({ studentId: code, reason: 'Capacity reached' });
        continue;
      }
      // Prereq check
      if (prereqIds.length > 0) {
        const completed = await prisma.enrollment.findMany({
          where: { studentId: sid, status: 'COMPLETED' },
          select: { offering: { select: { courseId: true } } },
        });
        const completedSet = new Set(completed.map((c) => c.offering.courseId));
        const missing = prereqIds.filter((pid) => !completedSet.has(pid));
        if (missing.length > 0) {
          results.errors.push({ studentId: code, reason: 'Prerequisites not satisfied' });
          continue;
        }
      }
      try {
        if (status) {
          await prisma.enrollment.update({
            where: { studentId_offeringId: { studentId: sid, offeringId } },
            data: { status: 'ENROLLED', droppedAt: null, enrolledAt: new Date() },
          });
        } else {
          await prisma.enrollment.create({ data: { studentId: sid, offeringId } });
        }
        results.enrolled++;
        willAdd++;
      } catch (e) {
        results.errors.push({ studentId: code, reason: e.message });
      }
    }

    res.json({ success: true, ...results, total: studentIds.length });
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

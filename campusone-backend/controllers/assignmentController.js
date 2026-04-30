import prisma from '../prisma/client.js';
import { uploadToStorage, deleteFromStorage, pathFromUrl } from '../utils/supabaseStorage.js';
import { v4 as uuidv4 } from 'uuid';

const BUCKET = 'Assignments';

const assignmentInclude = {
  offering: {
    select: {
      id: true, section: true,
      course: { select: { id: true, code: true, title: true } },
      term: { select: { id: true, code: true, season: true, academicYear: true } },
    },
  },
  _count: { select: { submissions: true } },
};

// ─── TEACHER ENDPOINTS ────────────────────────────────────────────────────────

// GET /api/assignments?offeringId=  (teacher: own offerings; admin: all)
export const getAssignments = async (req, res) => {
  try {
    const { offeringId } = req.query;
    const where = {};

    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

      if (offeringId) {
        // Verify teacher owns this offering
        const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher.id } });
        if (!offering) return res.status(403).json({ success: false, message: 'Not your offering' });
        where.offeringId = offeringId;
      } else {
        where.offering = { teacherId: teacher.id };
      }
    } else if (offeringId) {
      where.offeringId = offeringId;
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: assignmentInclude,
      orderBy: { dueDate: 'asc' },
    });
    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/assignments/my  (student: assignments for their enrolled offerings)
export const getMyAssignments = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, status: { in: ['ENROLLED', 'COMPLETED'] } },
      select: { offeringId: true },
    });
    const offeringIds = enrollments.map((e) => e.offeringId);

    const assignments = await prisma.assignment.findMany({
      where: { offeringId: { in: offeringIds }, status: { not: 'DRAFT' } },
      include: {
        ...assignmentInclude,
        submissions: {
          where: { studentId: student.id },
          select: { id: true, status: true, obtainedMarks: true, feedback: true, submittedAt: true, attachmentUrl: true, submissionText: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json({ success: true, count: assignments.length, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/assignments/:id
export const getAssignmentById = async (req, res) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: assignmentInclude,
    });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/assignments  — teacher creates; supports optional file upload
export const createAssignment = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.status(403).json({ success: false, message: 'Teacher profile not found' });

    const { offeringId, title, description, totalMarks, dueDate, allowLate, status } = req.body;
    if (!offeringId || !title || !dueDate) {
      return res.status(400).json({ success: false, message: 'offeringId, title, and dueDate are required' });
    }

    const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher.id } });
    if (!offering) return res.status(403).json({ success: false, message: 'Not your offering' });

    let attachmentUrl = null;
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const filePath = `teacher-files/${offeringId}/${uuidv4()}.${ext}`;
      attachmentUrl = await uploadToStorage(BUCKET, filePath, req.file.buffer, req.file.mimetype);
    }

    const assignment = await prisma.assignment.create({
      data: {
        offeringId,
        title,
        description: description || null,
        totalMarks: totalMarks ? +totalMarks : 100,
        dueDate: new Date(dueDate),
        allowLate: allowLate === 'true' || allowLate === true,
        attachmentUrl,
        status: status || 'PUBLISHED',
      },
      include: assignmentInclude,
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/assignments/:id
export const updateAssignment = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    const existing = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { offering: { select: { teacherId: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (existing.offering.teacherId !== teacher?.id) {
      return res.status(403).json({ success: false, message: 'Not your assignment' });
    }

    const { title, description, totalMarks, dueDate, allowLate, status } = req.body;

    let attachmentUrl = existing.attachmentUrl;
    if (req.file) {
      // Delete old file if exists
      if (existing.attachmentUrl) {
        const oldPath = pathFromUrl(existing.attachmentUrl, BUCKET);
        if (oldPath) await deleteFromStorage(BUCKET, oldPath);
      }
      const ext = req.file.originalname.split('.').pop();
      const filePath = `teacher-files/${existing.offeringId}/${uuidv4()}.${ext}`;
      attachmentUrl = await uploadToStorage(BUCKET, filePath, req.file.buffer, req.file.mimetype);
    }

    const assignment = await prisma.assignment.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        totalMarks: totalMarks !== undefined ? +totalMarks : existing.totalMarks,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        allowLate: allowLate !== undefined ? (allowLate === 'true' || allowLate === true) : existing.allowLate,
        status: status ?? existing.status,
        attachmentUrl,
      },
      include: assignmentInclude,
    });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/assignments/:id
export const deleteAssignment = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    const existing = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { offering: { select: { teacherId: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (existing.offering.teacherId !== teacher?.id) {
      return res.status(403).json({ success: false, message: 'Not your assignment' });
    }

    if (existing.attachmentUrl) {
      const oldPath = pathFromUrl(existing.attachmentUrl, BUCKET);
      if (oldPath) await deleteFromStorage(BUCKET, oldPath);
    }

    await prisma.assignment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/assignments/:id/submissions  — teacher views all submissions
export const getSubmissions = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { offering: { select: { teacherId: true, _count: { select: { enrollments: true } } } } },
    });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.offering.teacherId !== teacher?.id) {
      return res.status(403).json({ success: false, message: 'Not your assignment' });
    }

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: req.params.id },
      include: {
        student: { select: { id: true, studentId: true, user: { select: { name: true, email: true } } } },
      },
      orderBy: { submittedAt: 'asc' },
    });
    res.json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/submissions/:id/grade  — teacher grades a submission
export const gradeSubmission = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: { assignment: { include: { offering: { select: { teacherId: true } } } } },
    });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (submission.assignment.offering.teacherId !== teacher?.id) {
      return res.status(403).json({ success: false, message: 'Not your assignment' });
    }

    const { obtainedMarks, feedback } = req.body;
    const updated = await prisma.submission.update({
      where: { id: req.params.id },
      data: {
        obtainedMarks: obtainedMarks !== undefined ? +obtainedMarks : undefined,
        feedback: feedback ?? undefined,
        status: 'GRADED',
        gradedAt: new Date(),
        gradedBy: teacher.id,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── STUDENT ENDPOINTS ────────────────────────────────────────────────────────

// POST /api/assignments/:id/submit  — student submits
export const submitAssignment = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.status === 'DRAFT') return res.status(400).json({ success: false, message: 'Assignment not published yet' });

    const isLate = new Date() > new Date(assignment.dueDate);
    if (isLate && !assignment.allowLate) {
      return res.status(400).json({ success: false, message: 'Deadline has passed and late submissions are not allowed' });
    }

    const { submissionText } = req.body;
    if (!submissionText && !req.file) {
      return res.status(400).json({ success: false, message: 'Provide submissionText or upload a file' });
    }

    let attachmentUrl = null;
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const filePath = `submissions/${assignment.offeringId}/${student.id}/${uuidv4()}.${ext}`;
      attachmentUrl = await uploadToStorage(BUCKET, filePath, req.file.buffer, req.file.mimetype);
    }

    const existing = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    });

    let submission;
    if (existing) {
      // Re-submission — replace old file if any
      if (existing.attachmentUrl && attachmentUrl) {
        const oldPath = pathFromUrl(existing.attachmentUrl, BUCKET);
        if (oldPath) await deleteFromStorage(BUCKET, oldPath);
      }
      submission = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          submissionText: submissionText ?? existing.submissionText,
          attachmentUrl: attachmentUrl ?? existing.attachmentUrl,
          isLate,
          status: isLate ? 'LATE' : 'SUBMITTED',
          submittedAt: new Date(),
          // Reset grading on re-submit
          obtainedMarks: null,
          feedback: null,
          gradedAt: null,
          gradedBy: null,
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: student.id,
          submissionText: submissionText ?? null,
          attachmentUrl,
          isLate,
          status: isLate ? 'LATE' : 'SUBMITTED',
        },
      });
    }
    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/assignments/:id/my-submission
export const getMySubmission = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const submission = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: req.params.id, studentId: student.id } },
    });
    res.json({ success: true, data: submission ?? null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

import prisma from '../prisma/client.js';

// GET /api/semester-incharges?programId=&batch=&academicYear=&status=
export const getIncharges = async (req, res) => {
  try {
    const { programId, batch, academicYear, status } = req.query;
    const where = {};
    if (programId) where.programId = programId;
    if (batch) where.batch = batch;
    if (academicYear) where.academicYear = academicYear;
    if (status) where.status = status;

    const incharges = await prisma.semesterIncharge.findMany({
      where,
      include: {
        teacher: { select: { id: true, designation: true, user: { select: { name: true, email: true } } } },
        program: { select: { id: true, programCode: true, name: true } },
      },
      orderBy: [{ academicYear: 'desc' }, { semesterNumber: 'asc' }],
    });
    res.json({ success: true, count: incharges.length, data: incharges });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/semester-incharges/my  — teacher's own incharge assignments
export const getMyInchargeAssignments = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found' });

    const incharges = await prisma.semesterIncharge.findMany({
      where: { teacherId: teacher.id, status: 'active' },
      include: { program: { select: { id: true, programCode: true, name: true } } },
      orderBy: [{ academicYear: 'desc' }, { semesterNumber: 'asc' }],
    });
    res.json({ success: true, count: incharges.length, data: incharges });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/semester-incharges
export const assignIncharge = async (req, res) => {
  try {
    const { teacherId, programId, batch, academicYear, semesterNumber } = req.body;
    if (!teacherId || !programId || !batch || !academicYear || semesterNumber === undefined) {
      return res.status(400).json({ success: false, message: 'teacherId, programId, batch, academicYear, semesterNumber are required' });
    }

    const existing = await prisma.semesterIncharge.findUnique({
      where: { programId_batch_semesterNumber_academicYear: { programId, batch, semesterNumber: +semesterNumber, academicYear } },
    });
    if (existing && existing.status === 'active') {
      return res.status(409).json({ success: false, message: 'An active incharge is already assigned for this scope' });
    }

    let incharge;
    if (existing) {
      incharge = await prisma.semesterIncharge.update({
        where: { id: existing.id },
        data: { teacherId, status: 'active', assignedAt: new Date(), relievedAt: null },
      });
    } else {
      incharge = await prisma.semesterIncharge.create({
        data: { teacherId, programId, batch, academicYear, semesterNumber: +semesterNumber },
      });
    }

    const populated = await prisma.semesterIncharge.findUnique({
      where: { id: incharge.id },
      include: {
        teacher: { select: { id: true, designation: true, user: { select: { name: true } } } },
        program: { select: { id: true, programCode: true, name: true } },
      },
    });
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/semester-incharges/:id/relieve
export const relieveIncharge = async (req, res) => {
  try {
    await prisma.semesterIncharge.update({
      where: { id: req.params.id },
      data: { status: 'relieved', relievedAt: new Date() },
    });
    res.json({ success: true, message: 'Incharge relieved' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/semester-incharges/:id
export const deleteIncharge = async (req, res) => {
  try {
    await prisma.semesterIncharge.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Incharge assignment deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

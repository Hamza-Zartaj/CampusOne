import prisma from '../prisma/client.js';
import { auditLog } from '../utils/auditLogger.js';

// GET /api/programs
export const getAllPrograms = async (req, res) => {
  try {
    const { departmentId, type, includeInactive } = req.query;
    const where = includeInactive === 'true' ? {} : { isActive: true };
    if (departmentId) where.departmentId = departmentId;
    if (type) where.type = type;

    const programs = await prisma.program.findMany({
      where,
      include: {
        department: { select: { code: true, name: true } },
        _count: { select: { students: true, curricula: true, incharges: true } },
      },
      orderBy: [{ department: { code: 'asc' } }, { programCode: 'asc' }],
    });

    res.json({ success: true, count: programs.length, data: programs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/programs/:id
export const getProgramById = async (req, res) => {
  try {
    const program = await prisma.program.findUnique({
      where: { id: req.params.id },
      include: {
        department: { select: { id: true, code: true, name: true } },
        curricula: {
          orderBy: { version: 'desc' },
          select: { id: true, version: true, effectiveFromYear: true, effectiveToYear: true, totalCredits: true, isActive: true },
        },
        _count: { select: { students: true } },
      },
    });
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });
    res.json({ success: true, data: program });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/programs/:id/curriculum  — curriculum with courses grouped by semester
export const getProgramCurriculum = async (req, res) => {
  try {
    const { version } = req.query;
    const whereVersion = version ? { version } : { isActive: true };

    const curriculum = await prisma.curriculum.findFirst({
      where: { programId: req.params.id, ...whereVersion },
      include: {
        courses: {
          include: {
            course: {
              include: {
                department: { select: { code: true } },
                prerequisites: { select: { id: true, code: true, title: true } },
              },
            },
          },
          orderBy: [{ semesterSlot: 'asc' }, { course: { title: 'asc' } }],
        },
      },
    });

    if (!curriculum) return res.status(404).json({ success: false, message: 'No active curriculum found' });

    // Group by semesterSlot
    const grouped = {};
    for (const cc of curriculum.courses) {
      const slot = cc.semesterSlot;
      if (!grouped[slot]) grouped[slot] = [];
      grouped[slot].push({ ...cc.course, semesterSlot: slot, type: cc.type, isElective: cc.isElective });
    }

    const semesters = Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([slot, courses]) => ({ semester: Number(slot), courses }));

    res.json({ success: true, data: { curriculum: { ...curriculum, courses: undefined }, semesters } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/programs
export const createProgram = async (req, res) => {
  try {
    const { programCode, name, type, totalSemesters, totalCredits, departmentId } = req.body;
    if (!programCode || !name || !type || !totalSemesters || !totalCredits || !departmentId) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existing = await prisma.program.findUnique({ where: { programCode: programCode.toUpperCase() } });
    if (existing) return res.status(409).json({ success: false, message: `Program code "${programCode}" already exists` });

    const program = await prisma.program.create({
      data: { programCode: programCode.toUpperCase(), name, type, totalSemesters: +totalSemesters, totalCredits: +totalCredits, departmentId },
      include: { department: { select: { code: true, name: true } } },
    });
    auditLog({
      action: 'CREATE_PROGRAM', category: 'ACADEMIC',
      performedBy: req.user.id, performedByRole: req.user.role,
      targetModel: 'Program', targetId: program.id,
      description: `Created program ${program.programCode} — ${program.name}`,
      newValue: { programCode: program.programCode, name: program.name, type: program.type },
    });
    res.status(201).json({ success: true, data: program });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/programs/:id
export const updateProgram = async (req, res) => {
  try {
    const { name, type, totalSemesters, totalCredits, departmentId, isActive } = req.body;
    const program = await prisma.program.update({
      where: { id: req.params.id },
      data: {
        name,
        type,
        totalSemesters: totalSemesters !== undefined ? +totalSemesters : undefined,
        totalCredits: totalCredits !== undefined ? +totalCredits : undefined,
        departmentId,
        isActive,
      },
    });
    auditLog({
      action: 'UPDATE_PROGRAM', category: 'ACADEMIC',
      performedBy: req.user.id, performedByRole: req.user.role,
      targetModel: 'Program', targetId: program.id,
      description: `Updated program ${program.programCode}`,
    });
    res.json({ success: true, data: program });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Program not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/programs/:id
export const deleteProgram = async (req, res) => {
  try {
    await prisma.program.update({ where: { id: req.params.id }, data: { isActive: false } });
    auditLog({
      action: 'DELETE_PROGRAM', category: 'ACADEMIC',
      performedBy: req.user.id, performedByRole: req.user.role,
      targetModel: 'Program', targetId: req.params.id,
      description: `Deactivated program ID ${req.params.id}`,
    });
    res.json({ success: true, message: 'Program deactivated' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Program not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

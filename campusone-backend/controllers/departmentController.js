import prisma from '../prisma/client.js';

// GET /api/departments
export const getAllDepartments = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const where = includeInactive === 'true' ? {} : { isActive: true };

    const departments = await prisma.department.findMany({
      where,
      include: {
        hod: { select: { id: true, designation: true, user: { select: { name: true } } } },
        _count: { select: { programs: true, courses: true, students: true, teachers: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, count: departments.length, data: departments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/departments/:id
export const getDepartmentById = async (req, res) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: {
        hod: { select: { id: true, designation: true, user: { select: { name: true, email: true } } } },
        programs: { where: { isActive: true }, select: { id: true, programCode: true, name: true, type: true, totalSemesters: true } },
        _count: { select: { courses: true, students: true, teachers: true } },
      },
    });
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, data: dept });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/departments
export const createDepartment = async (req, res) => {
  try {
    const { code, name, description, hodTeacherId } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: 'code and name are required' });

    const existing = await prisma.department.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(409).json({ success: false, message: `Department code "${code}" already exists` });

    const dept = await prisma.department.create({
      data: { code: code.toUpperCase(), name, description, hodTeacherId: hodTeacherId || null },
    });
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/departments/:id
export const updateDepartment = async (req, res) => {
  try {
    const { name, description, hodTeacherId } = req.body;
    const dept = await prisma.department.update({
      where: { id: req.params.id },
      data: { name, description, hodTeacherId: hodTeacherId ?? undefined },
    });
    res.json({ success: true, data: dept });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Department not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/departments/:id  (soft delete)
export const deleteDepartment = async (req, res) => {
  try {
    await prisma.department.update({
      where: { id: req.params.id },
      data: { isActive: false, deletedAt: new Date() },
    });
    res.json({ success: true, message: 'Department deactivated' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Department not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/departments/:id/restore
export const restoreDepartment = async (req, res) => {
  try {
    await prisma.department.update({
      where: { id: req.params.id },
      data: { isActive: true, deletedAt: null },
    });
    res.json({ success: true, message: 'Department restored' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Department not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

import prisma from '../prisma/client.js';

const offeringInclude = {
  course: { select: { id: true, code: true, title: true, creditHours: true, sessionType: true } },
  term: { select: { id: true, code: true, season: true, academicYear: true } },
  teacher: { select: { id: true, designation: true, user: { select: { name: true, email: true } } } },
  sessions: { include: { room: true }, orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }] },
  _count: { select: { enrollments: true } },
};

// GET /api/offerings
export const getAllOfferings = async (req, res) => {
  try {
    const { termId, teacherId, courseId, departmentId, includeInactive } = req.query;
    const where = includeInactive === 'true' ? {} : { isActive: true };
    if (termId) where.termId = termId;
    if (teacherId) where.teacherId = teacherId;
    if (courseId) where.courseId = courseId;
    if (departmentId) where.course = { departmentId };

    const offerings = await prisma.courseOffering.findMany({
      where,
      include: offeringInclude,
      orderBy: [{ course: { code: 'asc' } }, { section: 'asc' }],
    });
    res.json({ success: true, count: offerings.length, data: offerings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/offerings/:id
export const getOfferingById = async (req, res) => {
  try {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: req.params.id },
      include: {
        ...offeringInclude,
        enrollments: {
          where: { status: { in: ['ENROLLED', 'COMPLETED', 'INCOMPLETE'] } },
          include: { student: { select: { id: true, studentId: true, user: { select: { name: true } } } } },
          orderBy: { enrolledAt: 'asc' },
        },
      },
    });
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });
    res.json({ success: true, data: offering });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/offerings/my — teacher's own offerings for active term
export const getMyOfferings = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found' });

    const { termId } = req.query;
    const activeTerm = termId
      ? { id: termId }
      : await prisma.term.findFirst({ where: { isActive: true } });

    const offerings = await prisma.courseOffering.findMany({
      where: { teacherId: teacher.id, termId: activeTerm?.id, isActive: true },
      include: { ...offeringInclude },
      orderBy: { course: { code: 'asc' } },
    });
    res.json({ success: true, count: offerings.length, data: offerings, term: activeTerm });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/offerings/:id/students
export const getOfferingStudents = async (req, res) => {
  try {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: req.params.id },
      select: { teacherId: true, course: { select: { code: true, title: true } }, term: { select: { code: true } } },
    });
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });

    // Only teacher who owns this offering or admin can view
    if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher || teacher.id !== offering.teacherId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId: req.params.id },
      include: {
        student: {
          select: { id: true, studentId: true, batch: true, currentSemester: true, user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { student: { studentId: 'asc' } },
    });

    res.json({ success: true, count: enrollments.length, data: enrollments, offering });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/offerings
export const createOffering = async (req, res) => {
  try {
    const { courseId, termId, teacherId, section, capacity } = req.body;
    if (!courseId || !termId || !teacherId || !section) {
      return res.status(400).json({ success: false, message: 'courseId, termId, teacherId, section are required' });
    }

    const existing = await prisma.courseOffering.findUnique({
      where: { courseId_termId_section: { courseId, termId, section: section.toUpperCase() } },
    });
    if (existing) return res.status(409).json({ success: false, message: 'An offering for this course/term/section already exists' });

    const offering = await prisma.courseOffering.create({
      data: { courseId, termId, teacherId, section: section.toUpperCase(), capacity: capacity ? +capacity : 40 },
      include: offeringInclude,
    });
    res.status(201).json({ success: true, data: offering });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/offerings/:id
export const updateOffering = async (req, res) => {
  try {
    const { teacherId, capacity, isActive } = req.body;
    const offering = await prisma.courseOffering.update({
      where: { id: req.params.id },
      data: {
        teacherId,
        capacity: capacity !== undefined ? +capacity : undefined,
        isActive,
      },
      include: offeringInclude,
    });
    res.json({ success: true, data: offering });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Offering not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/offerings/:id
export const deleteOffering = async (req, res) => {
  try {
    const enrollmentCount = await prisma.enrollment.count({
      where: { offeringId: req.params.id, status: 'ENROLLED' },
    });
    if (enrollmentCount > 0) {
      return res.status(409).json({ success: false, message: `Cannot delete: ${enrollmentCount} students are still enrolled` });
    }
    await prisma.courseOffering.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Offering deactivated' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Offering not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

import prisma from '../prisma/client.js';

// GET /api/courses
export const getAllCourses = async (req, res) => {
  try {
    const { departmentId, includeInactive } = req.query;
    const where = includeInactive === 'true' ? {} : { isActive: true };
    if (departmentId) where.departmentId = departmentId;

    const courses = await prisma.course.findMany({
      where,
      include: {
        department: { select: { code: true, name: true } },
        prerequisites: { select: { id: true, code: true, title: true } },
        _count: { select: { offerings: true, curriculumLinks: true } },
      },
      orderBy: [{ department: { code: 'asc' } }, { code: 'asc' }],
    });

    res.json({ success: true, count: courses.length, data: courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/courses/:id
export const getCourseById = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        department: { select: { id: true, code: true, name: true } },
        prerequisites: { select: { id: true, code: true, title: true, creditHours: true } },
        prerequisiteFor: { select: { id: true, code: true, title: true } },
        curriculumLinks: {
          include: { curriculum: { select: { version: true, program: { select: { programCode: true, name: true } } } } },
        },
        _count: { select: { offerings: true } },
      },
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/courses
export const createCourse = async (req, res) => {
  try {
    const { code, title, description, creditHours, departmentId, prerequisiteIds, expectedLectureCount } = req.body;
    if (!code || !title || !creditHours || !departmentId) {
      return res.status(400).json({ success: false, message: 'code, title, creditHours, departmentId are required' });
    }
    const plannedLectures = expectedLectureCount === undefined || expectedLectureCount === '' || expectedLectureCount === null
      ? null
      : Number(expectedLectureCount);
    if (plannedLectures !== null && (!Number.isInteger(plannedLectures) || plannedLectures < 0)) {
      return res.status(400).json({ success: false, message: 'expectedLectureCount must be a whole number 0 or greater' });
    }

    const existing = await prisma.course.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(409).json({ success: false, message: `Course code "${code}" already exists` });

    const course = await prisma.course.create({
      data: {
        code: code.toUpperCase(),
        title,
        description,
        creditHours: +creditHours,
        expectedLectureCount: plannedLectures,
        departmentId,
        prerequisites: prerequisiteIds?.length
          ? { connect: prerequisiteIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        department: { select: { code: true, name: true } },
        prerequisites: { select: { id: true, code: true, title: true } },
      },
    });
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/courses/:id
export const updateCourse = async (req, res) => {
  try {
    const { title, description, creditHours, departmentId, isActive, expectedLectureCount } = req.body;
    const plannedLectures = expectedLectureCount === undefined
      ? undefined
      : expectedLectureCount === '' || expectedLectureCount === null
        ? null
        : Number(expectedLectureCount);
    if (plannedLectures !== undefined && plannedLectures !== null && (!Number.isInteger(plannedLectures) || plannedLectures < 0)) {
      return res.status(400).json({ success: false, message: 'expectedLectureCount must be a whole number 0 or greater' });
    }
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        creditHours: creditHours !== undefined ? +creditHours : undefined,
        expectedLectureCount: plannedLectures,
        departmentId,
        isActive,
      },
    });
    res.json({ success: true, data: course });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Course not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/courses/:id  (soft)
export const deleteCourse = async (req, res) => {
  try {
    await prisma.course.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Course deactivated' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Course not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/courses/:id/prerequisites
export const addPrerequisite = async (req, res) => {
  try {
    const { prerequisiteId } = req.body;
    if (!prerequisiteId) return res.status(400).json({ success: false, message: 'prerequisiteId is required' });
    if (prerequisiteId === req.params.id) return res.status(400).json({ success: false, message: 'A course cannot be its own prerequisite' });

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { prerequisites: { connect: { id: prerequisiteId } } },
      include: { prerequisites: { select: { id: true, code: true, title: true } } },
    });
    res.json({ success: true, data: course.prerequisites });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Course not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/courses/:id/prerequisites/:prereqId
export const removePrerequisite = async (req, res) => {
  try {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { prerequisites: { disconnect: { id: req.params.prereqId } } },
      include: { prerequisites: { select: { id: true, code: true, title: true } } },
    });
    res.json({ success: true, data: course.prerequisites });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Course not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

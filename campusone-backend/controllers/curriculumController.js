import prisma from '../prisma/client.js';

// GET /api/curricula?programId=
export const getCurriculaByProgram = async (req, res) => {
  try {
    const { programId } = req.query;
    if (!programId) return res.status(400).json({ success: false, message: 'programId is required' });

    const curricula = await prisma.curriculum.findMany({
      where: { programId },
      include: { _count: { select: { courses: true, students: true } } },
      orderBy: { version: 'desc' },
    });
    res.json({ success: true, count: curricula.length, data: curricula });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/curricula/:id
export const getCurriculumById = async (req, res) => {
  try {
    const curriculum = await prisma.curriculum.findUnique({
      where: { id: req.params.id },
      include: {
        program: { select: { id: true, programCode: true, name: true } },
        courses: {
          include: {
            course: {
              include: {
                department: { select: { code: true } },
                prerequisites: { select: { id: true, code: true, title: true } },
              },
            },
          },
          orderBy: [{ semesterSlot: 'asc' }, { course: { code: 'asc' } }],
        },
      },
    });
    if (!curriculum) return res.status(404).json({ success: false, message: 'Curriculum not found' });
    res.json({ success: true, data: curriculum });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/curricula
export const createCurriculum = async (req, res) => {
  try {
    const { programId, version, effectiveFromYear, effectiveToYear, totalCredits } = req.body;
    if (!programId || !version || !effectiveFromYear || !totalCredits) {
      return res.status(400).json({ success: false, message: 'programId, version, effectiveFromYear, totalCredits are required' });
    }

    const existing = await prisma.curriculum.findUnique({ where: { programId_version: { programId, version } } });
    if (existing) return res.status(409).json({ success: false, message: 'A curriculum with this version already exists for the program' });

    const curriculum = await prisma.curriculum.create({
      data: { programId, version, effectiveFromYear: +effectiveFromYear, effectiveToYear: effectiveToYear ? +effectiveToYear : null, totalCredits: +totalCredits },
    });
    res.status(201).json({ success: true, data: curriculum });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/curricula/:id
export const updateCurriculum = async (req, res) => {
  try {
    const { version, effectiveFromYear, effectiveToYear, totalCredits, isActive } = req.body;
    const curriculum = await prisma.curriculum.update({
      where: { id: req.params.id },
      data: {
        version,
        effectiveFromYear: effectiveFromYear !== undefined ? +effectiveFromYear : undefined,
        effectiveToYear: effectiveToYear !== undefined ? (effectiveToYear ? +effectiveToYear : null) : undefined,
        totalCredits: totalCredits !== undefined ? +totalCredits : undefined,
        isActive,
      },
    });
    res.json({ success: true, data: curriculum });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Curriculum not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/curricula/:id/courses  — add a course to curriculum
export const addCourseToCurriculum = async (req, res) => {
  try {
    const { courseId, semesterSlot, type, isElective } = req.body;
    if (!courseId || !semesterSlot) return res.status(400).json({ success: false, message: 'courseId and semesterSlot are required' });

    const existing = await prisma.curriculumCourse.findUnique({
      where: { curriculumId_courseId: { curriculumId: req.params.id, courseId } },
    });
    if (existing) return res.status(409).json({ success: false, message: 'Course already in this curriculum' });

    const cc = await prisma.curriculumCourse.create({
      data: { curriculumId: req.params.id, courseId, semesterSlot: +semesterSlot, type: type || 'CORE', isElective: isElective || false },
      include: { course: { select: { code: true, title: true, creditHours: true } } },
    });
    res.status(201).json({ success: true, data: cc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/curricula/:id/courses/:courseId
export const updateCurriculumCourse = async (req, res) => {
  try {
    const { semesterSlot, type, isElective } = req.body;
    const cc = await prisma.curriculumCourse.update({
      where: { curriculumId_courseId: { curriculumId: req.params.id, courseId: req.params.courseId } },
      data: {
        semesterSlot: semesterSlot !== undefined ? +semesterSlot : undefined,
        type,
        isElective,
      },
    });
    res.json({ success: true, data: cc });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Course not found in this curriculum' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/curricula/:id/courses/:courseId
export const removeCourseFromCurriculum = async (req, res) => {
  try {
    await prisma.curriculumCourse.delete({
      where: { curriculumId_courseId: { curriculumId: req.params.id, courseId: req.params.courseId } },
    });
    res.json({ success: true, message: 'Course removed from curriculum' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Course not found in this curriculum' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/curricula/:id/clone  — duplicate a curriculum version
export const cloneCurriculum = async (req, res) => {
  try {
    const { newVersion, effectiveFromYear } = req.body;
    if (!newVersion || !effectiveFromYear) {
      return res.status(400).json({ success: false, message: 'newVersion and effectiveFromYear are required' });
    }

    const source = await prisma.curriculum.findUnique({
      where: { id: req.params.id },
      include: { courses: true },
    });
    if (!source) return res.status(404).json({ success: false, message: 'Source curriculum not found' });

    const existing = await prisma.curriculum.findUnique({
      where: { programId_version: { programId: source.programId, version: newVersion } },
    });
    if (existing) return res.status(409).json({ success: false, message: 'Version already exists' });

    const newCurriculum = await prisma.$transaction(async (tx) => {
      const created = await tx.curriculum.create({
        data: {
          programId: source.programId,
          version: newVersion,
          effectiveFromYear: +effectiveFromYear,
          totalCredits: source.totalCredits,
          isActive: false,
        },
      });
      await tx.curriculumCourse.createMany({
        data: source.courses.map((cc) => ({
          curriculumId: created.id,
          courseId: cc.courseId,
          semesterSlot: cc.semesterSlot,
          type: cc.type,
          isElective: cc.isElective,
        })),
      });
      return created;
    });

    res.status(201).json({ success: true, data: newCurriculum, message: 'Curriculum cloned successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

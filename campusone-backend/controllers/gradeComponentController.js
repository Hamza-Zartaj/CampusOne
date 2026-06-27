import prisma from '../prisma/client.js';
import { TEMPLATES, getTemplate, validateWeights } from '../utils/gradeTemplates.js';

// GET /api/courses/templates
export const getTemplates = async (_req, res) => {
  res.json({ success: true, data: TEMPLATES });
};

// GET /api/courses/:id/grade-components
export const listForCourse = async (req, res) => {
  try {
    const components = await prisma.courseGradeComponent.findMany({
      where: { courseId: req.params.id },
      orderBy: { orderIndex: 'asc' },
    });
    res.json({ success: true, data: components });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/courses/:id/grade-components — replace all
export const replaceForCourse = async (req, res) => {
  try {
    const { components } = req.body;
    if (!Array.isArray(components)) {
      return res.status(400).json({ success: false, message: 'components array required' });
    }
    const v = validateWeights(components);
    if (!v.valid) return res.status(400).json({ success: false, message: v.message });

    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    await prisma.$transaction([
      prisma.courseGradeComponent.deleteMany({ where: { courseId: req.params.id } }),
      prisma.courseGradeComponent.createMany({
        data: components.map((c, i) => ({
          courseId: req.params.id,
          kind: c.kind,
          label: c.label,
          count: +c.count,
          totalPerInstance: +c.totalPerInstance,
          weightPercent: +c.weightPercent,
          aggregation: c.aggregation || 'AVERAGE',
          orderIndex: c.orderIndex ?? i,
        })),
      }),
    ]);
    const saved = await prisma.courseGradeComponent.findMany({
      where: { courseId: req.params.id },
      orderBy: { orderIndex: 'asc' },
    });
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const assertCanReleaseCourseMarks = async ({ courseId, offeringId, user }) => {
  if (user.role === 'admin') {
    if (!offeringId) return { ok: true, courseId };
    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      select: { courseId: true },
    });
    if (!offering) return { ok: false, code: 404, message: 'Offering not found' };
    return { ok: true, courseId: offering.courseId };
  }
  const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
  if (!teacher) return { ok: false, code: 403, message: 'Teacher profile not found' };

  const offering = await prisma.courseOffering.findFirst({
    where: {
      teacherId: teacher.id,
      ...(courseId ? { courseId } : { id: offeringId }),
    },
    select: { courseId: true },
  });
  if (!offering) return { ok: false, code: 403, message: 'Not authorized for this course' };
  return { ok: true, courseId: offering.courseId };
};

// PUT /api/courses/:id/grade-components/:kind/release
// CourseGradeComponent is course-scoped, so this toggles visibility for every offering of the course.
export const setReleasedForCourse = async (req, res) => {
  try {
    const { id: courseId, kind } = req.params;
    const { released } = req.body;
    if (typeof released !== 'boolean') {
      return res.status(400).json({ success: false, message: 'released boolean required' });
    }

    const access = await assertCanReleaseCourseMarks({ courseId, user: req.user });
    if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });

    const updated = await prisma.courseGradeComponent.updateMany({
      where: { courseId, kind },
      data: { marksReleased: released },
    });
    if (updated.count === 0) {
      return res.status(404).json({ success: false, message: 'Component not found' });
    }
    res.json({ success: true, scope: 'course', courseId, kind, released });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Backward-compatible offering-shaped route. It still applies course-wide because the schema is course-scoped.
export const setReleased = async (req, res) => {
  const access = await assertCanReleaseCourseMarks({ offeringId: req.params.offeringId, user: req.user });
  if (!access.ok) return res.status(access.code).json({ success: false, message: access.message });
  req.params.id = access.courseId;
  return setReleasedForCourse(req, res);
};

// POST /api/courses/:id/grade-components/apply-template
export const applyTemplate = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    const tmpl = getTemplate(course.sessionType);

    await prisma.$transaction([
      prisma.courseGradeComponent.deleteMany({ where: { courseId: req.params.id } }),
      prisma.courseGradeComponent.createMany({
        data: tmpl.map((row) => ({ courseId: req.params.id, ...row })),
      }),
    ]);
    const saved = await prisma.courseGradeComponent.findMany({
      where: { courseId: req.params.id },
      orderBy: { orderIndex: 'asc' },
    });
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

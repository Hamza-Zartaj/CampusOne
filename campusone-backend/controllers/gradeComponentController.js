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

// PUT /api/offerings/:offeringId/grade-components/:kind/release
// Teacher of the offering (or admin) toggles marksReleased for a given component kind.
export const setReleased = async (req, res) => {
  try {
    const { offeringId, kind } = req.params;
    const { released } = req.body;
    if (typeof released !== 'boolean') {
      return res.status(400).json({ success: false, message: 'released boolean required' });
    }

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      select: { courseId: true, teacherId: true },
    });
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });

    if (req.user.role !== 'admin') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher || teacher.id !== offering.teacherId) {
        return res.status(403).json({ success: false, message: 'Not your offering' });
      }
    }

    const updated = await prisma.courseGradeComponent.updateMany({
      where: { courseId: offering.courseId, kind },
      data: { marksReleased: released },
    });
    if (updated.count === 0) {
      return res.status(404).json({ success: false, message: 'Component not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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

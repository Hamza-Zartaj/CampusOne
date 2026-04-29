import prisma from '../prisma/client.js';

// GET /api/terms
export const getAllTerms = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const where = academicYear ? { academicYear } : {};

    const terms = await prisma.term.findMany({
      where,
      include: { _count: { select: { offerings: true } } },
      orderBy: [{ academicYear: 'desc' }, { season: 'asc' }],
    });
    res.json({ success: true, count: terms.length, data: terms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/terms/active
export const getActiveTerm = async (req, res) => {
  try {
    const term = await prisma.term.findFirst({
      where: { isActive: true },
      include: { _count: { select: { offerings: true } } },
    });
    res.json({ success: true, data: term || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/terms/:id
export const getTermById = async (req, res) => {
  try {
    const term = await prisma.term.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { offerings: true } },
      },
    });
    if (!term) return res.status(404).json({ success: false, message: 'Term not found' });
    res.json({ success: true, data: term });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/terms
export const createTerm = async (req, res) => {
  try {
    const { code, season, academicYear, startDate, endDate, registrationOpenAt, registrationCloseAt } = req.body;
    if (!code || !season || !academicYear || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'code, season, academicYear, startDate, endDate are required' });
    }

    const existing = await prisma.term.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(409).json({ success: false, message: `Term code "${code}" already exists` });

    const term = await prisma.term.create({
      data: {
        code: code.toUpperCase(),
        season,
        academicYear,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationOpenAt: registrationOpenAt ? new Date(registrationOpenAt) : null,
        registrationCloseAt: registrationCloseAt ? new Date(registrationCloseAt) : null,
      },
    });
    res.status(201).json({ success: true, data: term });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/terms/:id
export const updateTerm = async (req, res) => {
  try {
    const { season, academicYear, startDate, endDate, registrationOpenAt, registrationCloseAt } = req.body;
    const term = await prisma.term.update({
      where: { id: req.params.id },
      data: {
        season,
        academicYear,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        registrationOpenAt: registrationOpenAt !== undefined ? (registrationOpenAt ? new Date(registrationOpenAt) : null) : undefined,
        registrationCloseAt: registrationCloseAt !== undefined ? (registrationCloseAt ? new Date(registrationCloseAt) : null) : undefined,
      },
    });
    res.json({ success: true, data: term });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Term not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/terms/:id/activate  — set as the active term (deactivates all others)
export const activateTerm = async (req, res) => {
  try {
    await prisma.$transaction([
      prisma.term.updateMany({ data: { isActive: false } }),
      prisma.term.update({ where: { id: req.params.id }, data: { isActive: true } }),
    ]);
    res.json({ success: true, message: 'Term activated' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Term not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

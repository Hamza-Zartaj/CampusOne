import prisma from '../prisma/client.js';

// GET /api/audit-logs
export const getAuditLogs = async (req, res) => {
  try {
    const {
      category,
      targetModel,
      performedBy,
      search,
      from,
      to,
      page = 1,
      limit = 50,
    } = req.query;

    const where = {};

    if (category) where.category = category;
    if (targetModel) where.targetModel = targetModel;
    if (performedBy) where.performedBy = performedBy;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { targetModel: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    // Enrich with performer name (batch lookup)
    const performerIds = [...new Set(logs.map((l) => l.performedBy))];
    const users = await prisma.user.findMany({
      where: { id: { in: performerIds } },
      select: { id: true, name: true, username: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = logs.map((log) => ({
      ...log,
      performer: userMap[log.performedBy] ?? { id: log.performedBy, name: 'Unknown', username: '' },
    }));

    res.json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
      data: enriched,
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/audit-logs/categories  — distinct category list for filter dropdown
export const getCategories = async (req, res) => {
  try {
    const rows = await prisma.auditLog.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    res.json({ success: true, data: rows.map((r) => r.category) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

import prisma from '../prisma/client.js';

// GET /api/rooms
export const getAllRooms = async (req, res) => {
  try {
    const { type, building, isActive } = req.query;
    const where = {};
    if (type) where.type = type;
    if (building) where.building = building;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rooms = await prisma.room.findMany({
      where,
      orderBy: [{ building: 'asc' }, { floor: 'asc' }, { code: 'asc' }],
    });
    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/rooms
export const createRoom = async (req, res) => {
  try {
    const { code, name, type, capacity, building, floor, isActive } = req.body;
    if (!code || !type) return res.status(400).json({ success: false, message: 'code and type are required' });

    const existing = await prisma.room.findUnique({ where: { code } });
    if (existing) return res.status(409).json({ success: false, message: `Room ${code} already exists` });

    const room = await prisma.room.create({
      data: {
        code,
        name: name || null,
        type,
        capacity: capacity ?? 40,
        building: building || null,
        floor: floor ?? null,
        isActive: isActive ?? true,
      },
    });
    res.status(201).json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/rooms/:id
export const updateRoom = async (req, res) => {
  try {
    const { name, type, capacity, building, floor, isActive } = req.body;
    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: { name, type, capacity, building, floor, isActive },
    });
    res.json({ success: true, data: room });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Room not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/rooms/:id
export const deleteRoom = async (req, res) => {
  try {
    const sessionCount = await prisma.classSession.count({ where: { roomId: req.params.id } });
    if (sessionCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Room is used by ${sessionCount} class session${sessionCount === 1 ? '' : 's'}. Deactivate instead.`,
      });
    }
    await prisma.room.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Room not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

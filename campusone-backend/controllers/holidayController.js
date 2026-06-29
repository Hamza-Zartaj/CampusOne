import prisma from '../prisma/client.js';
import { parseDateOnly } from '../utils/dateOnly.js';

// GET /api/holidays?termId=X&year=2026
export const getAllHolidays = async (req, res) => {
  try {
    const { termId, year } = req.query;
    const where = {};
    if (termId) where.termId = termId;
    if (year) {
      where.date = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      };
    }
    const holidays = await prisma.holiday.findMany({ where, orderBy: { date: 'asc' } });
    res.json({ success: true, count: holidays.length, data: holidays });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/holidays
export const createHoliday = async (req, res) => {
  try {
    const { date, name, isRecurring, termId } = req.body;
    if (!date || !name) return res.status(400).json({ success: false, message: 'date and name required' });
    const dateValue = parseDateOnly(date);
    if (!dateValue) {
      return res.status(400).json({ success: false, message: 'date must be a real calendar date in YYYY-MM-DD format' });
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: dateValue,
        name,
        isRecurring: !!isRecurring,
        termId: termId || null,
      },
    });
    res.status(201).json({ success: true, data: holiday });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Holiday with this date and name already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/holidays/:id
export const deleteHoliday = async (req, res) => {
  try {
    await prisma.holiday.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Holiday deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, message: 'Holiday not found' });
    res.status(500).json({ success: false, message: err.message });
  }
};

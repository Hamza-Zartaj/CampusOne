import prisma from '../prisma/client.js';

// ----- Slot computation -----
const parseTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const formatTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const computeSlots = (config) => {
  const days = Array.isArray(config.workingDays) ? config.workingDays : JSON.parse(config.workingDays || '[]');
  const overrides = typeof config.dayOverrides === 'object' ? config.dayOverrides : JSON.parse(config.dayOverrides || '{}');
  const startMin = parseTime(config.dayStartTime);
  const lec = config.lectureDurationMin;
  const brk = config.breakDurationMin;

  const result = {};
  for (const day of days) {
    const ov = overrides?.[day];
    const lectures = ov?.lecturesPerDay ?? config.regularLecturesPerDay;
    const slots = [];
    let cursor = startMin;
    for (let i = 1; i <= lectures; i++) {
      const sStart = cursor;
      const sEnd = sStart + lec;
      slots.push({ index: i, start: formatTime(sStart), end: formatTime(sEnd) });
      cursor = sEnd + brk;
      if (ov && ov.jummahAfterSlot === i && ov.jummahMin) {
        cursor = cursor - brk + ov.jummahMin; // replace regular break with jummah
      }
    }
    result[day] = slots;
  }
  return result;
};

// GET /api/schedule/config
export const getConfig = async (req, res) => {
  try {
    let config = await prisma.scheduleConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.scheduleConfig.create({ data: { id: 'default' } });
    }
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/schedule/config
export const updateConfig = async (req, res) => {
  try {
    const {
      lectureDurationMin, breakDurationMin, dayStartTime, workingDays,
      regularLecturesPerDay, maxTeacherLecturesPerDay, defaultSessionsPerCourse, dayOverrides,
    } = req.body;
    const config = await prisma.scheduleConfig.upsert({
      where: { id: 'default' },
      update: {
        lectureDurationMin, breakDurationMin, dayStartTime, workingDays,
        regularLecturesPerDay, maxTeacherLecturesPerDay, defaultSessionsPerCourse, dayOverrides,
      },
      create: {
        id: 'default',
        lectureDurationMin, breakDurationMin, dayStartTime, workingDays,
        regularLecturesPerDay, maxTeacherLecturesPerDay, defaultSessionsPerCourse, dayOverrides,
      },
    });
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/schedule/slots — computed slot table
export const getSlots = async (req, res) => {
  try {
    let config = await prisma.scheduleConfig.findUnique({ where: { id: 'default' } });
    if (!config) config = await prisma.scheduleConfig.create({ data: { id: 'default' } });
    const slots = computeSlots(config);
    res.json({ success: true, data: { config, slots } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/schedule/availability?termId=X&excludeOfferingId=Y
// Returns the full conflict matrix for the term so frontend can render badges.
export const getAvailability = async (req, res) => {
  try {
    const { termId, excludeOfferingId } = req.query;
    if (!termId) return res.status(400).json({ success: false, message: 'termId required' });

    const sessions = await prisma.classSession.findMany({
      where: {
        offering: { termId, ...(excludeOfferingId ? { NOT: { id: excludeOfferingId } } : {}) },
      },
      include: {
        offering: {
          select: {
            id: true, courseId: true, section: true, teacherId: true,
            course: { select: { code: true, title: true } },
            teacher: { select: { user: { select: { name: true } } } },
          },
        },
        room: { select: { id: true, code: true, type: true } },
      },
    });

    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/offerings/:id/sessions  body: { sessions: [{dayOfWeek, slotIndex, roomId}, ...] }
export const setOfferingSessions = async (req, res) => {
  try {
    const offeringId = req.params.id;
    const { sessions } = req.body;
    if (!Array.isArray(sessions)) return res.status(400).json({ success: false, message: 'sessions array required' });

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: { course: true, term: true },
    });
    if (!offering) return res.status(404).json({ success: false, message: 'Offering not found' });

    const config = await prisma.scheduleConfig.findUnique({ where: { id: 'default' } })
      || await prisma.scheduleConfig.create({ data: { id: 'default' } });
    const slotTable = computeSlots(config);

    // -- Validate count by sessionType --
    const expected = offering.course.sessionType === 'PROJECT' ? 0 : config.defaultSessionsPerCourse;
    if (sessions.length !== expected) {
      return res.status(400).json({
        success: false,
        message: `${offering.course.code} requires exactly ${expected} session${expected === 1 ? '' : 's'}, got ${sessions.length}.`,
      });
    }

    if (expected === 0) {
      await prisma.classSession.deleteMany({ where: { offeringId } });
      return res.json({ success: true, data: [] });
    }

    // -- Validate each session shape + day/slot exists --
    for (const s of sessions) {
      if (!s.dayOfWeek || !s.slotIndex || !s.roomId) {
        return res.status(400).json({ success: false, message: 'Each session needs dayOfWeek, slotIndex, roomId' });
      }
      const daySlots = slotTable[s.dayOfWeek];
      if (!daySlots || !daySlots.find((d) => d.index === s.slotIndex)) {
        return res.status(400).json({
          success: false,
          message: `Slot ${s.slotIndex} on ${s.dayOfWeek} is not available in the master schedule.`,
        });
      }
    }

    // -- Prevent two sessions on same (day,slot) within this offering --
    const seen = new Set();
    for (const s of sessions) {
      const k = `${s.dayOfWeek}-${s.slotIndex}`;
      if (seen.has(k)) {
        return res.status(400).json({ success: false, message: `Duplicate slot in your selection: ${s.dayOfWeek} slot ${s.slotIndex}` });
      }
      seen.add(k);
    }

    // -- Validate room type matches sessionType --
    const roomIds = [...new Set(sessions.map((s) => s.roomId))];
    const rooms = await prisma.room.findMany({ where: { id: { in: roomIds } } });
    if (rooms.length !== roomIds.length) {
      return res.status(400).json({ success: false, message: 'One or more rooms not found' });
    }
    for (const s of sessions) {
      const room = rooms.find((r) => r.id === s.roomId);
      if (!room.isActive) {
        return res.status(400).json({ success: false, message: `Room ${room.code} is inactive` });
      }
      if (offering.course.sessionType === 'LAB' && room.type !== 'LAB') {
        return res.status(400).json({ success: false, message: `Lab course must use a LAB room (got ${room.type} for ${room.code})` });
      }
      if (offering.course.sessionType === 'LECTURE' && room.type === 'LAB') {
        return res.status(400).json({ success: false, message: `Lecture course cannot use a LAB room (${room.code})` });
      }
    }

    // -- Check conflicts with other offerings in same term --
    const otherSessions = await prisma.classSession.findMany({
      where: { offering: { termId: offering.termId, NOT: { id: offeringId } } },
      include: {
        offering: {
          select: {
            id: true, courseId: true, section: true, teacherId: true,
            course: { select: { code: true } },
          },
        },
        room: { select: { code: true } },
      },
    });

    for (const s of sessions) {
      // Room double-book
      const roomClash = otherSessions.find((o) =>
        o.dayOfWeek === s.dayOfWeek && o.slotIndex === s.slotIndex && o.roomId === s.roomId,
      );
      if (roomClash) {
        const room = rooms.find((r) => r.id === s.roomId);
        return res.status(409).json({
          success: false,
          message: `Room ${room.code} is already booked at ${s.dayOfWeek} slot ${s.slotIndex} by ${roomClash.offering.course.code}-${roomClash.offering.section}.`,
        });
      }

      // Teacher double-book
      const teacherClash = otherSessions.find((o) =>
        o.dayOfWeek === s.dayOfWeek && o.slotIndex === s.slotIndex && o.offering.teacherId === offering.teacherId,
      );
      if (teacherClash) {
        return res.status(409).json({
          success: false,
          message: `Teacher already teaching ${teacherClash.offering.course.code}-${teacherClash.offering.section} at ${s.dayOfWeek} slot ${s.slotIndex}.`,
        });
      }

      // Same course different section overlap
      const sectionClash = otherSessions.find((o) =>
        o.dayOfWeek === s.dayOfWeek && o.slotIndex === s.slotIndex && o.offering.courseId === offering.courseId,
      );
      if (sectionClash) {
        return res.status(409).json({
          success: false,
          message: `Another section (${sectionClash.offering.section}) of ${offering.course.code} runs at ${s.dayOfWeek} slot ${s.slotIndex}. Pick a non-overlapping slot.`,
        });
      }
    }

    // -- Teacher max lectures per day --
    const teacherDayCount = {};
    for (const o of otherSessions) {
      if (o.offering.teacherId !== offering.teacherId) continue;
      teacherDayCount[o.dayOfWeek] = (teacherDayCount[o.dayOfWeek] || 0) + 1;
    }
    for (const s of sessions) {
      teacherDayCount[s.dayOfWeek] = (teacherDayCount[s.dayOfWeek] || 0) + 1;
      if (teacherDayCount[s.dayOfWeek] > config.maxTeacherLecturesPerDay) {
        return res.status(409).json({
          success: false,
          message: `Teacher would exceed ${config.maxTeacherLecturesPerDay} lectures on ${s.dayOfWeek}.`,
        });
      }
    }

    // -- All checks passed: replace sessions atomically --
    await prisma.$transaction([
      prisma.classSession.deleteMany({ where: { offeringId } }),
      prisma.classSession.createMany({
        data: sessions.map((s) => ({
          offeringId,
          dayOfWeek: s.dayOfWeek,
          slotIndex: s.slotIndex,
          roomId: s.roomId,
        })),
      }),
    ]);

    const saved = await prisma.classSession.findMany({
      where: { offeringId },
      include: { room: true },
      orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }],
    });
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/offerings/:id/sessions
export const getOfferingSessions = async (req, res) => {
  try {
    const sessions = await prisma.classSession.findMany({
      where: { offeringId: req.params.id },
      include: { room: true },
      orderBy: [{ dayOfWeek: 'asc' }, { slotIndex: 'asc' }],
    });
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

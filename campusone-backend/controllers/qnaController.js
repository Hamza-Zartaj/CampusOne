import prisma from '../prisma/client.js';
import { sendQnaQuestionEmail } from '../services/emailService.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const threadInclude = {
  offering: {
    select: {
      id: true, section: true, teacherId: true,
      course: { select: { id: true, code: true, title: true } },
      term: { select: { code: true } },
      teacher: { select: { id: true, user: { select: { id: true, name: true, email: true } } } },
    },
  },
  replies: { orderBy: { createdAt: 'asc' } },
  _count: { select: { replies: true } },
};

// Verify the user has access to the offering (teacher owns it OR student enrolled OR admin)
const verifyOfferingAccess = async (user, offeringId) => {
  if (user.role === 'admin') {
    const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
    return offering ? { offering } : { error: 'Offering not found', status: 404 };
  }
  if (user.role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher) return { error: 'Teacher profile not found', status: 403 };
    const offering = await prisma.courseOffering.findFirst({ where: { id: offeringId, teacherId: teacher.id } });
    if (!offering) return { error: 'Not your offering', status: 403 };
    return { offering, teacher };
  }
  if (user.role === 'student') {
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    if (!student) return { error: 'Student profile not found', status: 403 };
    const enrolled = await prisma.enrollment.findFirst({
      where: { studentId: student.id, offeringId, status: { in: ['ENROLLED', 'COMPLETED'] } },
      include: { offering: true },
    });
    if (!enrolled) return { error: 'Not enrolled in this course', status: 403 };
    return { offering: enrolled.offering, student };
  }
  return { error: 'Unauthorized', status: 403 };
};

// Enrich threads with author + replies' author info (User-level, since asker can be student or teacher)
const enrichThreads = async (threads) => {
  const userIds = new Set();
  threads.forEach((t) => {
    userIds.add(t.askedById);
    (t.replies || []).forEach((r) => userIds.add(r.authorId));
  });
  if (userIds.size === 0) return threads;
  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, name: true, role: true, email: true },
  });
  const map = new Map(users.map((u) => [u.id, u]));
  return threads.map((t) => ({
    ...t,
    askedBy: map.get(t.askedById) || null,
    replies: (t.replies || []).map((r) => ({ ...r, author: map.get(r.authorId) || null })),
  }));
};

// GET /api/qna?offeringId=  — list threads
export const getThreads = async (req, res) => {
  try {
    const { offeringId, status } = req.query;
    const where = {};

    if (offeringId) {
      const check = await verifyOfferingAccess(req.user, offeringId);
      if (check.error) return res.status(check.status).json({ success: false, message: check.error });
      where.offeringId = offeringId;
    } else if (req.user.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
      if (!teacher) return res.status(403).json({ success: false, message: 'Teacher profile not found' });
      where.offering = { teacherId: teacher.id };
    } else if (req.user.role === 'student') {
      const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!student) return res.status(403).json({ success: false, message: 'Student profile not found' });
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id, status: { in: ['ENROLLED', 'COMPLETED'] } },
        select: { offeringId: true },
      });
      where.offeringId = { in: enrollments.map((e) => e.offeringId) };
    }

    if (status) where.status = status;

    const threads = await prisma.qnaThread.findMany({
      where,
      include: {
        offering: threadInclude.offering,
        _count: threadInclude._count,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = await enrichThreads(threads.map((t) => ({ ...t, replies: [] })));
    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('[qna] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/qna/:id  — thread detail with replies
export const getThreadById = async (req, res) => {
  try {
    const thread = await prisma.qnaThread.findUnique({
      where: { id: req.params.id },
      include: threadInclude,
    });
    if (!thread) return res.status(404).json({ success: false, message: 'Thread not found' });

    const check = await verifyOfferingAccess(req.user, thread.offeringId);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    const [enriched] = await enrichThreads([thread]);
    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('[qna] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/qna  — create thread (student asks)
export const createThread = async (req, res) => {
  try {
    const { offeringId, title, body } = req.body;
    if (!offeringId || !title || !body) {
      return res.status(400).json({ success: false, message: 'offeringId, title, and body are required' });
    }

    const check = await verifyOfferingAccess(req.user, offeringId);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    const thread = await prisma.qnaThread.create({
      data: {
        offeringId,
        askedById: req.user.id,
        title: title.trim(),
        body: body.trim(),
      },
      include: threadInclude,
    });

    // Fire-and-forget email to course teacher(s)
    (async () => {
      try {
        const offering = await prisma.courseOffering.findUnique({
          where: { id: offeringId },
          include: {
            course: true,
            teacher: { include: { user: true } },
          },
        });
        if (!offering?.teacher?.user?.email) return;

        const asker = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
        await sendQnaQuestionEmail({
          email: offering.teacher.user.email,
          teacherName: offering.teacher.user.name,
          askerName: asker?.name || 'A student',
          courseCode: offering.course.code,
          courseTitle: offering.course.title,
          questionTitle: title,
          questionBody: body,
          threadUrl: `${CLIENT_URL}/teacher/qna?thread=${thread.id}`,
        });
      } catch (err) {
        console.error('Q&A email failed:', err.message);
      }
    })();

    const [enriched] = await enrichThreads([thread]);
    res.status(201).json({ success: true, data: enriched });
  } catch (err) {
    console.error('[qna] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/qna/:id/replies  — post a reply
export const createReply = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Reply body is required' });
    }

    const thread = await prisma.qnaThread.findUnique({ where: { id: req.params.id } });
    if (!thread) return res.status(404).json({ success: false, message: 'Thread not found' });

    const check = await verifyOfferingAccess(req.user, thread.offeringId);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    const reply = await prisma.qnaReply.create({
      data: { threadId: thread.id, authorId: req.user.id, body: body.trim() },
    });

    // Bump thread's updatedAt
    await prisma.qnaThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });

    const author = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, role: true, email: true },
    });

    res.status(201).json({ success: true, data: { ...reply, author } });
  } catch (err) {
    console.error('[qna] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/qna/:id/status  — mark resolved / reopen
export const updateThreadStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['OPEN', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const thread = await prisma.qnaThread.findUnique({ where: { id: req.params.id } });
    if (!thread) return res.status(404).json({ success: false, message: 'Thread not found' });

    const check = await verifyOfferingAccess(req.user, thread.offeringId);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    // Asker, teacher, or admin can change status
    const isAsker = thread.askedById === req.user.id;
    const isTeacherOrAdmin = req.user.role === 'teacher' || req.user.role === 'admin';
    if (!isAsker && !isTeacherOrAdmin) {
      return res.status(403).json({ success: false, message: 'Only asker or teacher can change status' });
    }

    const updated = await prisma.qnaThread.update({
      where: { id: thread.id },
      data: { status },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[qna] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/qna/:id  — asker, teacher of offering, or admin
export const deleteThread = async (req, res) => {
  try {
    const thread = await prisma.qnaThread.findUnique({ where: { id: req.params.id } });
    if (!thread) return res.status(404).json({ success: false, message: 'Thread not found' });

    const check = await verifyOfferingAccess(req.user, thread.offeringId);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    const isAsker = thread.askedById === req.user.id;
    const isTeacherOrAdmin = req.user.role === 'teacher' || req.user.role === 'admin';
    if (!isAsker && !isTeacherOrAdmin) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    await prisma.qnaThread.delete({ where: { id: thread.id } });
    res.json({ success: true, message: 'Thread deleted' });
  } catch (err) {
    console.error('[qna] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/qna/replies/:replyId  — author, teacher of offering, or admin
export const deleteReply = async (req, res) => {
  try {
    const reply = await prisma.qnaReply.findUnique({
      where: { id: req.params.replyId },
      include: { thread: true },
    });
    if (!reply) return res.status(404).json({ success: false, message: 'Reply not found' });

    const check = await verifyOfferingAccess(req.user, reply.thread.offeringId);
    if (check.error) return res.status(check.status).json({ success: false, message: check.error });

    const isAuthor = reply.authorId === req.user.id;
    const isTeacherOrAdmin = req.user.role === 'teacher' || req.user.role === 'admin';
    if (!isAuthor && !isTeacherOrAdmin) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    await prisma.qnaReply.delete({ where: { id: req.params.replyId } });
    res.json({ success: true, message: 'Reply deleted' });
  } catch (err) {
    console.error('[qna] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

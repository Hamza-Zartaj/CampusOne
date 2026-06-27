import logger from '../utils/logger.js';
import prisma from '../prisma/client.js';
import { generateQuizQuestions, validateAIQuizRequest } from '../services/aiQuizService.js';

const generationWindows = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

const consumeGenerationAllowance = (userId) => {
  const now = Date.now();
  const recent = (generationWindows.get(userId) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return false;
  recent.push(now);
  generationWindows.set(userId, recent);
  return true;
};

// POST /api/quizzes/ai/generate
export const generateAIQuizQuestions = async (req, res) => {
  try {
    let request;
    try {
      request = validateAIQuizRequest(req.body);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const offeringId = String(req.body.offeringId || '').trim();
    if (!offeringId) {
      return res.status(400).json({ success: false, message: 'Select a course offering first' });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (!teacher) return res.status(403).json({ success: false, message: 'Teacher profile not found' });

    const offering = await prisma.courseOffering.findFirst({
      where: { id: offeringId, teacherId: teacher.id },
      select: {
        id: true,
        course: { select: { code: true, title: true } },
      },
    });
    if (!offering) return res.status(403).json({ success: false, message: 'Not your course offering' });

    if (!consumeGenerationAllowance(req.user.id)) {
      return res.status(429).json({
        success: false,
        code: 'AI_RATE_LIMITED',
        message: 'Please wait a minute before generating more quiz questions',
      });
    }

    const generated = await generateQuizQuestions({
      courseCode: offering.course.code,
      courseTitle: offering.course.title,
      ...request,
    });

    res.json({
      success: true,
      data: {
        ...generated,
        course: offering.course,
      },
    });
  } catch (error) {
    if (error.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, code: error.code, message: error.message });
    }
    if (error.code === 'AI_INVALID_OUTPUT') {
      return res.status(422).json({ success: false, code: error.code, message: error.message });
    }
    if (error.status === 401) {
      return res.status(503).json({
        success: false,
        code: 'AI_AUTH_FAILED',
        message: 'The configured OpenAI API key was rejected. Check OPENAI_API_KEY and restart the backend.',
      });
    }
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        code: 'AI_PROVIDER_RATE_LIMIT',
        message: 'OpenAI is temporarily rate-limiting requests. Please try again shortly.',
      });
    }

    logger.error('AI quiz generation failed:', error.message);
    res.status(502).json({
      success: false,
      code: 'AI_GENERATION_FAILED',
      message: 'AI quiz generation failed. Please try again.',
    });
  }
};

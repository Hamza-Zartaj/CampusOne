import logger from '../utils/logger.js';
import prisma from '../prisma/client.js';
import { notifyMany } from '../services/notificationService.js';
import { uploadToBucket, deleteFromBucket, isStorageConfigured } from '../services/storageService.js';

const getApprovedTAWithPermission = async ({ userId, offeringId, permission }) => {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) return null;
  const ta = await prisma.tAAssignment.findUnique({
    where: { studentId_offeringId: { studentId: student.id, offeringId } },
    include: {
      offering: {
        include: {
          course: { select: { code: true, title: true } },
          teacher: { select: { userId: true } },
        },
      },
    },
  });
  if (!ta || ta.status !== 'APPROVED' || !ta.permissions.includes(permission)) return null;
  return { student, ta };
};

// GET /api/ta/resources?offeringId=X
export const listResources = async (req, res) => {
  try {
    const { offeringId } = req.query;
    if (!offeringId) return res.status(400).json({ success: false, message: 'offeringId is required' });

    const access = await getApprovedTAWithPermission({
      userId: req.user.id,
      offeringId,
      permission: 'UPLOAD_RESOURCES',
    });
    if (!access) return res.status(403).json({ success: false, message: 'Not authorised to manage resources for this offering' });

    const resources = await prisma.tAResource.findMany({
      where: { offeringId },
      include: { uploadedBy: { select: { studentId: true, user: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: resources });
  } catch (err) {
    logger.error('[ta-resources] list error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/ta/resources  multipart: { offeringId, title, description?, file }
export const uploadResource = async (req, res) => {
  try {
    const { offeringId, title, description } = req.body;
    if (!offeringId || !title) {
      return res.status(400).json({ success: false, message: 'offeringId and title are required' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'A resource file is required' });
    if (!isStorageConfigured()) {
      return res.status(500).json({ success: false, message: 'Storage not configured' });
    }

    const access = await getApprovedTAWithPermission({
      userId: req.user.id,
      offeringId,
      permission: 'UPLOAD_RESOURCES',
    });
    if (!access) return res.status(403).json({ success: false, message: 'Not authorised to upload resources for this offering' });

    const upload = await uploadToBucket(
      'lectures',
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `ta-resources/${offeringId}/${access.student.id}`,
    );

    const resource = await prisma.tAResource.create({
      data: {
        offeringId,
        taAssignmentId: access.ta.id,
        uploadedByStudentId: access.student.id,
        title: String(title).trim(),
        description: description ? String(description).trim().slice(0, 2000) : null,
        fileUrl: upload.publicUrl,
        fileName: upload.originalName,
        filePath: upload.path,
        mimeType: req.file.mimetype,
      },
    });

    const enrolled = await prisma.enrollment.findMany({
      where: { offeringId, status: 'ENROLLED' },
      select: { student: { select: { userId: true } } },
    });
    const userIds = enrolled.map((entry) => entry.student?.userId).filter(Boolean);
    if (userIds.length) {
      await notifyMany({
        userIds,
        type: 'ANNOUNCEMENT',
        title: `${access.ta.offering.course.code}: New TA resource`,
        body: resource.title,
        linkUrl: '/student/courses',
        metadata: { offeringId, resourceId: resource.id },
      });
    }

    res.status(201).json({ success: true, data: resource });
  } catch (err) {
    logger.error('[ta-resources] upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/ta/resources/:id
export const deleteResource = async (req, res) => {
  try {
    const resource = await prisma.tAResource.findUnique({ where: { id: req.params.id } });
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    const access = await getApprovedTAWithPermission({
      userId: req.user.id,
      offeringId: resource.offeringId,
      permission: 'UPLOAD_RESOURCES',
    });
    if (!access || resource.uploadedByStudentId !== access.student.id) {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this resource' });
    }

    await prisma.tAResource.delete({ where: { id: resource.id } });
    if (resource.filePath) {
      await deleteFromBucket('lectures', resource.filePath).catch((err) => logger.warn('[ta-resources] file delete failed:', err.message));
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('[ta-resources] delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

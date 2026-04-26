import prisma from '../prisma/client.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Audit Logger Service
 * Provides methods to log various actions for audit trail
 */
class AuditLogger {
  /**
   * Create a single audit log entry
   */
  static async log(data) {
    try {
      const logEntry = await prisma.auditLog.create({
        data: {
          ...data,
          createdAt: new Date()
        }
      });
      return logEntry;
    } catch (error) {
      console.error('Audit log error:', error.message);
      // Don't throw - audit logging should not break the main operation
      return null;
    }
  }

  /**
   * Create multiple audit log entries (for bulk operations)
   */
  static async logBulk(entries) {
    try {
      const bulkOperationId = uuidv4();
      const logsWithBulkId = entries.map((entry, index) => ({
        ...entry,
        bulkOperationId,
        bulkOperationIndex: index,
        createdAt: new Date()
      }));
      const logs = await prisma.auditLog.createMany({
        data: logsWithBulkId,
        skipDuplicates: false
      });
      return { bulkOperationId, count: logs.count };
    } catch (error) {
      console.error('Bulk audit log error:', error.message);
      return null;
    }
  }

  /**
   * Log incharge assignment
   */
  static async logInchargeAssignment(data) {
    return this.log({
      action: 'INCHARGE_ASSIGNED',
      category: 'INCHARGE',
      performedBy: data.performedBy,
      performedByRole: data.performedByRole,
      targetModel: 'SemesterIncharge',
      targetId: data.inchargeId,
      relatedEntities: [
        { model: 'Teacher', id: data.teacherId, identifier: data.teacherName },
        { model: 'Program', id: data.programId, identifier: data.programCode }
      ],
      newValue: {
        teacher: data.teacherId,
        program: data.programId,
        batch: data.batch,
        academicYear: data.academicYear,
        semesterNumber: data.semesterNumber
      },
      academicYear: data.academicYear,
      semesterNumber: data.semesterNumber,
      program: data.programId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
  }

  /**
   * Log incharge replacement
   */
  static async logInchargeReplacement(data) {
    return this.log({
      action: 'INCHARGE_REPLACED',
      category: 'INCHARGE',
      performedBy: data.performedBy,
      performedByRole: data.performedByRole,
      targetModel: 'SemesterIncharge',
      targetId: data.newInchargeId,
      relatedEntities: [
        { model: 'Teacher', id: data.previousTeacherId, identifier: data.previousTeacherName },
        { model: 'Teacher', id: data.newTeacherId, identifier: data.newTeacherName },
        { model: 'Program', id: data.programId, identifier: data.programCode }
      ],
      previousValue: {
        teacher: data.previousTeacherId,
        inchargeId: data.previousInchargeId
      },
      newValue: {
        teacher: data.newTeacherId,
        inchargeId: data.newInchargeId
      },
      academicYear: data.academicYear,
      semesterNumber: data.semesterNumber,
      program: data.programId,
      reason: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
  }

  /**
   * Log incharge relief
   */
  static async logInchargeRelief(data) {
    return this.log({
      action: 'INCHARGE_RELIEVED',
      category: 'INCHARGE',
      performedBy: data.performedBy,
      performedByRole: data.performedByRole,
      targetModel: 'SemesterIncharge',
      targetId: data.inchargeId,
      relatedEntities: [
        { model: 'Teacher', id: data.teacherId, identifier: data.teacherName },
        { model: 'Program', id: data.programId, identifier: data.programCode }
      ],
      previousValue: { status: 'active' },
      newValue: { status: 'relieved' },
      academicYear: data.academicYear,
      semesterNumber: data.semesterNumber,
      program: data.programId,
      reason: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
  }

  /**
   * Log grade submission/update
   */
  static async logGradeChange(data) {
    return this.log({
      action: data.isOverride ? 'GRADE_OVERRIDE' : (data.isUpdate ? 'GRADE_UPDATED' : 'GRADE_SUBMITTED'),
      category: 'GRADE',
      performedBy: data.performedBy,
      performedByRole: data.performedByRole,
      targetModel: 'Enrollment',
      targetId: data.enrollmentId,
      relatedEntities: [
        { model: 'Student', id: data.studentId, identifier: data.studentIdentifier },
        { model: 'CourseOffering', id: data.courseOfferingId, identifier: data.courseCode }
      ],
      previousValue: data.previousGrade ? {
        grade: data.previousGrade,
        gradePoints: data.previousGradePoints,
        totalMarks: data.previousTotalMarks
      } : null,
      newValue: {
        grade: data.newGrade,
        gradePoints: data.newGradePoints,
        totalMarks: data.newTotalMarks
      },
      academicYear: data.academicYear,
      semesterNumber: data.semesterNumber,
      reason: data.reason,
      notes: data.notes,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
  }

  /**
   * Log results lock/unlock
   */
  static async logResultsLock(data) {
    return this.log({
      action: data.isLock ? 'RESULTS_LOCKED' : 'RESULTS_UNLOCKED',
      category: 'GRADE',
      performedBy: data.performedBy,
      performedByRole: data.performedByRole,
      targetModel: 'CourseOffering',
      targetId: data.courseOfferingId,
      relatedEntities: [
        { model: 'Course', id: data.courseId, identifier: data.courseCode }
      ],
      previousValue: { resultsLocked: !data.isLock },
      newValue: { resultsLocked: data.isLock },
      academicYear: data.academicYear,
      semesterNumber: data.semesterNumber,
      reason: data.reason,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
  }

  /**
   * Log enrollment action
   */
  static async logEnrollmentAction(data) {
    const actionMap = {
      'create': 'ENROLLMENT_CREATED',
      'force_create': 'ENROLLMENT_FORCE_CREATED',
      'drop': 'ENROLLMENT_DROPPED',
      'withdraw': 'ENROLLMENT_WITHDRAWN',
      'restore': 'ENROLLMENT_RESTORED',
      'swap': 'ENROLLMENT_SWAP'
    };

    return this.log({
      action: actionMap[data.actionType] || 'ENROLLMENT_CREATED',
      category: 'ENROLLMENT',
      performedBy: data.performedBy,
      performedByRole: data.performedByRole,
      targetModel: 'Enrollment',
      targetId: data.enrollmentId,
      relatedEntities: [
        { model: 'Student', id: data.studentId, identifier: data.studentIdentifier },
        { model: 'CourseOffering', id: data.courseOfferingId, identifier: data.courseCode }
      ],
      previousValue: data.previousValue,
      newValue: data.newValue,
      academicYear: data.academicYear,
      semesterNumber: data.semesterNumber,
      reason: data.reason,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
  }

  /**
   * Log bulk enrollment
   */
  static async logBulkEnrollment(data) {
    const entries = data.enrollments.map(enrollment => ({
      action: 'ENROLLMENT_BULK_CREATED',
      category: 'ENROLLMENT',
      performedBy: data.performedBy,
      performedByRole: data.performedByRole,
      targetModel: 'Enrollment',
      targetId: enrollment.enrollmentId,
      relatedEntities: [
        { model: 'Student', id: enrollment.studentId, identifier: enrollment.studentIdentifier },
        { model: 'CourseOffering', id: data.courseOfferingId, identifier: data.courseCode }
      ],
      academicYear: data.academicYear,
      semesterNumber: data.semesterNumber,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    }));

    return this.logBulk(entries);
  }

  /**
   * Log import action
   */
  static async logImport(data) {
    const actionMap = {
      'courses': 'COURSES_IMPORTED',
      'curriculum': 'CURRICULUM_IMPORTED',
      'offerings': 'OFFERINGS_IMPORTED'
    };

    return this.log({
      action: actionMap[data.importType] || 'COURSES_IMPORTED',
      category: 'IMPORT',
      performedBy: data.performedBy,
      performedByRole: data.performedByRole,
      targetModel: data.targetModel || 'Course',
      targetId: data.performedBy, // Use user ID as target for imports
      metadata: {
        importType: data.importType,
        fileName: data.fileName,
        totalRows: data.totalRows,
        successful: data.successful,
        failed: data.failed,
        errors: data.errors
      },
      academicYear: data.academicYear,
      semesterNumber: data.semesterNumber,
      program: data.programId,
      notes: `Imported ${data.successful} of ${data.totalRows} records`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
  }

  /**
   * Query audit logs
   */
  static async query(filters, options = {}) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const where = {};

    if (filters.action) where.action = filters.action;
    if (filters.category) where.category = filters.category;
    if (filters.performedBy) where.performedBy = filters.performedBy;
    if (filters.targetModel) where.targetModel = filters.targetModel;
    if (filters.targetId) where.targetId = filters.targetId;
    if (filters.academicYear) where.academicYear = filters.academicYear;
    if (filters.semesterNumber) where.semesterNumber = filters.semesterNumber;
    if (filters.program) where.program = filters.program;
    if (filters.bulkOperationId) where.bulkOperationId = filters.bulkOperationId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const total = await prisma.auditLog.count({ where });
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit trail for a specific entity
   */
  static async getEntityAuditTrail(model, entityId, options = {}) {
    return this.query({
      targetModel: model,
      targetId: entityId
    }, options);
  }

  /**
   * Get audit logs by user
   */
  static async getUserAuditTrail(userId, options = {}) {
    return this.query({
      performedBy: userId
    }, options);
  }
}

export default AuditLogger;

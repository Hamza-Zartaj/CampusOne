import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      // Incharge actions
      'INCHARGE_ASSIGNED',
      'INCHARGE_REPLACED',
      'INCHARGE_RELIEVED',
      'INCHARGE_BULK_ASSIGNED',
      // Grade actions
      'GRADE_SUBMITTED',
      'GRADE_UPDATED',
      'GRADE_OVERRIDE',
      'GRADES_BULK_SUBMITTED',
      'RESULTS_LOCKED',
      'RESULTS_UNLOCKED',
      // Enrollment actions
      'ENROLLMENT_CREATED',
      'ENROLLMENT_FORCE_CREATED',
      'ENROLLMENT_DROPPED',
      'ENROLLMENT_WITHDRAWN',
      'ENROLLMENT_RESTORED',
      'ENROLLMENT_BULK_CREATED',
      'ENROLLMENT_SWAP',
      // Import actions
      'COURSES_IMPORTED',
      'CURRICULUM_IMPORTED',
      'OFFERINGS_IMPORTED',
      // Other
      'MANUAL_OVERRIDE',
      'SYSTEM_ACTION'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: ['INCHARGE', 'GRADE', 'ENROLLMENT', 'IMPORT', 'SYSTEM']
  },
  // Who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByRole: {
    type: String,
    trim: true
  },
  // Target entity
  targetModel: {
    type: String,
    required: true,
    enum: ['SemesterIncharge', 'Enrollment', 'CourseOffering', 'Course', 'Program', 'Student', 'Teacher']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  // Related entities
  relatedEntities: [{
    model: {
      type: String,
      enum: ['Student', 'Teacher', 'Course', 'CourseOffering', 'Program', 'Enrollment', 'SemesterIncharge']
    },
    id: mongoose.Schema.Types.ObjectId,
    identifier: String // Human-readable identifier like studentId, courseCode
  }],
  // Change details
  previousValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  // Context
  academicYear: {
    type: String,
    trim: true
  },
  semesterNumber: {
    type: Number
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program'
  },
  // Additional info
  reason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  // For bulk operations
  bulkOperationId: {
    type: String,
    trim: true
  },
  bulkOperationIndex: {
    type: Number
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ category: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ academicYear: 1, semesterNumber: 1 });
auditLogSchema.index({ program: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ bulkOperationId: 1 });

// Compound indexes
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);

import mongoose from 'mongoose';

/**
 * Enrollment Schema - Tracks student enrollments in course offerings
 */
const enrollmentSchema = new mongoose.Schema({
  // Reference to student (User with role 'student')
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Reference to specific course offering
  courseOfferingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering',
    required: true
  },
  // Enrollment status
  status: {
    type: String,
    required: true,
    enum: ['enrolled', 'completed', 'failed', 'withdrawn', 'dropped'],
    default: 'enrolled'
  },
  // Is this a repeat enrollment (failed before)?
  isRepeat: {
    type: Boolean,
    default: false
  },
  // Previous enrollment reference if this is a repeat
  previousEnrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    default: null
  },
  // Enrollment date
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  // Completion/withdrawal date
  completedAt: {
    type: Date,
    default: null
  },
  // Withdrawal reason (if applicable)
  withdrawalReason: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate enrollments
enrollmentSchema.index({ studentId: 1, courseOfferingId: 1 }, { unique: true });
enrollmentSchema.index({ courseOfferingId: 1 });
enrollmentSchema.index({ status: 1 });

// Static method to check if student is already enrolled
enrollmentSchema.statics.isEnrolled = async function(studentId, courseOfferingId) {
  const enrollment = await this.findOne({
    studentId,
    courseOfferingId,
    status: { $in: ['enrolled'] }
  });
  return !!enrollment;
};

// Static method to check if student has failed a course
enrollmentSchema.statics.hasFailedCourse = async function(studentId, courseId) {
  const CourseOffering = mongoose.model('CourseOffering');
  
  // Get all offerings of this course
  const offerings = await CourseOffering.find({ courseId }).select('_id');
  const offeringIds = offerings.map(o => o._id);
  
  // Check if student has failed any of these offerings
  const failedEnrollment = await this.findOne({
    studentId,
    courseOfferingId: { $in: offeringIds },
    status: 'failed'
  });
  
  return !!failedEnrollment;
};

export default mongoose.model('Enrollment', enrollmentSchema);

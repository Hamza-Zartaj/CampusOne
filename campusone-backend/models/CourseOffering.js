import mongoose from 'mongoose';

/**
 * CourseOffering Schema - Specific instances of courses offered in a term
 * A course can be offered multiple times across different terms
 */
const courseOfferingSchema = new mongoose.Schema({
  // Reference to the course in catalog
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseCatalog',
    required: true
  },
  // Which academic term this offering is for
  academicTermId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicTerm',
    required: true
  },
  // Which program(s) this offering is for
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  // Section identifier (A, B, C, etc.)
  section: {
    type: String,
    uppercase: true,
    trim: true,
    default: 'A'
  },
  // Assigned teacher for this offering
  assignedTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Assigned TAs for this offering
  assignedTAs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Maximum capacity
  maxCapacity: {
    type: Number,
    default: 50,
    min: 1
  },
  // Current enrollment count (denormalized for performance)
  currentEnrollment: {
    type: Number,
    default: 0,
    min: 0
  },
  // Schedule information
  schedule: {
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    startTime: String,
    endTime: String,
    room: String
  },
  // Is this a summer repeat course?
  isSummerRepeat: {
    type: Boolean,
    default: false
  },
  // Status of the offering
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for unique offering per term/program/section
courseOfferingSchema.index(
  { courseId: 1, academicTermId: 1, programId: 1, section: 1 },
  { unique: true }
);
courseOfferingSchema.index({ academicTermId: 1 });
courseOfferingSchema.index({ assignedTeacher: 1 });
courseOfferingSchema.index({ programId: 1 });

export default mongoose.model('CourseOffering', courseOfferingSchema);

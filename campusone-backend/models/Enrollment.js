import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Please provide student']
  },
  courseOffering: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseOffering',
    required: [true, 'Please provide course offering']
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program'
  },
  academicYear: {
    type: String,
    required: [true, 'Please provide academic year'],
    trim: true
  },
  semesterNumber: {
    type: Number,
    required: [true, 'Please provide semester number'],
    min: 1
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['enrolled', 'active', 'completed', 'dropped', 'withdrawn', 'failed', 'incomplete'],
    default: 'enrolled'
  },
  enrollmentType: {
    type: String,
    enum: ['regular', 'audit', 'credit', 'remedial', 'repeat'],
    default: 'regular'
  },
  // Grading
  midtermMarks: {
    type: Number,
    min: 0,
    max: 100
  },
  finalMarks: {
    type: Number,
    min: 0,
    max: 100
  },
  assignmentMarks: {
    type: Number,
    min: 0,
    max: 100
  },
  quizMarks: {
    type: Number,
    min: 0,
    max: 100
  },
  labMarks: {
    type: Number,
    min: 0,
    max: 100
  },
  totalMarks: {
    type: Number,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I', 'W', 'P', 'NP']
  },
  gradePoints: {
    type: Number,
    min: 0,
    max: 4
  },
  completedAt: {
    type: Date
  },
  droppedAt: {
    type: Date
  },
  dropReason: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  },
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ courseOffering: 1 });
enrollmentSchema.index({ program: 1 });
enrollmentSchema.index({ academicYear: 1 });
enrollmentSchema.index({ semesterNumber: 1 });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ student: 1, courseOffering: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, academicYear: 1, semesterNumber: 1 });
enrollmentSchema.index({ isDeleted: 1 });

// Query middleware to exclude soft-deleted documents by default
enrollmentSchema.pre(/^find/, function(next) {
  if (this.getOptions().includeSoftDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Soft delete method
enrollmentSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore method
enrollmentSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

// Method to calculate grade points
enrollmentSchema.methods.calculateGradePoints = function() {
  const gradePointMap = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0,
    'F': 0.0
  };
  this.gradePoints = gradePointMap[this.grade] || 0;
  return this.gradePoints;
};

export default mongoose.model('Enrollment', enrollmentSchema);

import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: [true, 'Please provide course code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  courseName: {
    type: String,
    required: [true, 'Please provide course name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please provide department']
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program'
  },
  creditHours: {
    type: Number,
    required: [true, 'Please provide credit hours'],
    min: 1,
    max: 6
  },
  lectureHours: {
    type: Number,
    default: 0,
    min: 0
  },
  labHours: {
    type: Number,
    default: 0,
    min: 0
  },
  tutorialHours: {
    type: Number,
    default: 0,
    min: 0
  },
  courseType: {
    type: String,
    enum: ['core', 'elective', 'lab', 'project', 'internship', 'thesis'],
    default: 'core'
  },
  domain: {
    type: String,
    trim: true
    // e.g., "Mathematics", "Computer Science", "Physics", "Humanities"
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  corequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  pairCourse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
    // For paired lab/theory courses
  },
  syllabus: {
    type: String,
    trim: true
  },
  learningOutcomes: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
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
courseSchema.index({ courseCode: 1 });
courseSchema.index({ department: 1 });
courseSchema.index({ program: 1 });
courseSchema.index({ domain: 1 });
courseSchema.index({ courseType: 1 });
courseSchema.index({ isDeleted: 1 });

// Query middleware to exclude soft-deleted documents by default
courseSchema.pre(/^find/, function(next) {
  if (this.getOptions().includeSoftDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Soft delete method
courseSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore method
courseSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

export default mongoose.model('Course', courseSchema);

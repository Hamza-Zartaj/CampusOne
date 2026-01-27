import mongoose from 'mongoose';

/**
 * CourseCatalog Schema - Master course definitions (reusable catalog)
 * This is the template for courses, not specific offerings
 */
const courseCatalogSchema = new mongoose.Schema({
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
  creditHours: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  // Theory + Lab breakdown
  theoryHours: {
    type: Number,
    default: 3,
    min: 0
  },
  labHours: {
    type: Number,
    default: 0,
    min: 0
  },
  // Prerequisites (references to other courses in catalog)
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseCatalog'
  }],
  // Learning objectives
  objectives: [{
    type: String,
    trim: true
  }],
  // Department that owns this course
  department: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
courseCatalogSchema.index({ courseCode: 1 });
courseCatalogSchema.index({ department: 1 });

export default mongoose.model('CourseCatalog', courseCatalogSchema);

import mongoose from 'mongoose';

/**
 * Curriculum Schema (ProgramCourse) - Maps courses to programs and semesters
 * Defines which courses are part of which program/semester
 */
const curriculumSchema = new mongoose.Schema({
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseCatalog',
    required: true
  },
  // Which semester this course belongs to (1-8 for bachelor)
  semesterNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  // Is this an elective or core course?
  isElective: {
    type: Boolean,
    default: false
  },
  // For electives: minimum courses student must pick from this group
  electiveGroup: {
    type: String,
    trim: true,
    default: null
  },
  // Is this course mandatory for graduation?
  isMandatory: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate entries
curriculumSchema.index({ programId: 1, courseId: 1, semesterNumber: 1 }, { unique: true });
curriculumSchema.index({ programId: 1, semesterNumber: 1 });

export default mongoose.model('Curriculum', curriculumSchema);

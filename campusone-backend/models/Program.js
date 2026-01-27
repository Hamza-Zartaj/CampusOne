import mongoose from 'mongoose';

/**
 * Program Schema - Defines academic programs (Bachelor's, ADP, etc.)
 */
const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide program name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide program code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  programType: {
    type: String,
    required: true,
    enum: ['bachelor', 'adp', 'master', 'phd'],
    default: 'bachelor'
  },
  // Total semesters: Bachelor = 8, ADP = 4 (2 years)
  totalSemesters: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  // First N semesters have only core courses
  coreSemestersCount: {
    type: Number,
    required: true,
    min: 1,
    default: 4
  },
  department: {
    type: String,
    required: [true, 'Please provide department'],
    trim: true
  },
  // Total credit hours required for graduation
  totalCreditHours: {
    type: Number,
    required: true,
    min: 1
  },
  // Minimum CGPA required for graduation
  minimumCGPA: {
    type: Number,
    default: 2.0,
    min: 0,
    max: 4
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
programSchema.index({ code: 1 });
programSchema.index({ department: 1 });

export default mongoose.model('Program', programSchema);

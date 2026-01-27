import mongoose from 'mongoose';

/**
 * Grade Schema - Stores final grades for enrollments
 */
const gradeSchema = new mongoose.Schema({
  // Reference to enrollment
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true,
    unique: true
  },
  // Letter grade
  letterGrade: {
    type: String,
    required: true,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'W', 'I', 'P', 'NP']
  },
  // Grade points (4.0 scale)
  gradePoints: {
    type: Number,
    required: true,
    min: 0,
    max: 4
  },
  // Percentage score
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  // Component breakdown
  components: {
    assignments: {
      obtained: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      weight: { type: Number, default: 20 }
    },
    quizzes: {
      obtained: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      weight: { type: Number, default: 15 }
    },
    midterm: {
      obtained: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      weight: { type: Number, default: 25 }
    },
    final: {
      obtained: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      weight: { type: Number, default: 40 }
    }
  },
  // Graded by (teacher/admin)
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Grade finalized date
  finalizedAt: {
    type: Date,
    default: Date.now
  },
  // Remarks
  remarks: {
    type: String,
    trim: true
  },
  // Is grade finalized?
  isFinalized: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index
gradeSchema.index({ enrollmentId: 1 });

// Static method to calculate grade points from letter grade
gradeSchema.statics.getGradePoints = function(letterGrade) {
  const gradeMap = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0,
    'F': 0.0, 'W': 0.0, 'I': 0.0, 'P': 0.0, 'NP': 0.0
  };
  return gradeMap[letterGrade] || 0;
};

// Static method to determine letter grade from percentage
gradeSchema.statics.getLetterGrade = function(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 45) return 'D+';
  if (percentage >= 40) return 'D';
  return 'F';
};

export default mongoose.model('Grade', gradeSchema);

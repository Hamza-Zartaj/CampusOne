import mongoose from 'mongoose';

const taEligibilitySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  completedCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    semester: {
      type: Number,
      required: true
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
      required: true
    },
    completedAt: {
      type: Date,
      required: true
    }
  }],
  currentSemester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  eligibleForSemesters: [{
    type: Number,
    min: 1,
    max: 8
  }],
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
taEligibilitySchema.index({ studentId: 1 });
taEligibilitySchema.index({ teacherId: 1 });

export default mongoose.model('TAEligibility', taEligibilitySchema);

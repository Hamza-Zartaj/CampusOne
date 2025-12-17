import mongoose from 'mongoose';

const taSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  assignedCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    responsibilities: [{
      type: String,
      enum: ['Grading', 'Lab Sessions', 'Office Hours', 'Tutorial Sessions', 'Assignment Help']
    }],
    hoursPerWeek: {
      type: Number,
      default: 0
    }
  }],
  totalHoursCompleted: {
    type: Number,
    default: 0
  },
  performanceRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for faster queries
taSchema.index({ userId: 1 });

export default mongoose.model('TA', taSchema);

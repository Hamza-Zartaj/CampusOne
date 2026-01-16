import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  studentId: {
    type: String,
    required: [true, 'Please provide student ID'],
    unique: true,
    trim: true
  },
  enrollmentYear: {
    type: Number,
    required: [true, 'Please provide enrollment year'],
    min: 2000,
    max: 2100
  },
  department: {
    type: String,
    required: [true, 'Please provide department'],
    trim: true
  },
  batch: {
    type: String,
    trim: true
  },
  currentSemester: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
    max: 8
  },
  enrolledCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dropped'],
      default: 'active'
    }
  }],
  completedCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    semester: Number,
    grade: {
      type: String,
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']
    },
    gpa: {
      type: Number,
      min: 0,
      max: 4
    },
    completedAt: Date
  }],
  cgpa: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  },
  totalCredits: {
    type: Number,
    default: 0
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    type: String,
    trim: true
  },
  guardianContact: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
studentSchema.index({ userId: 1 });
studentSchema.index({ studentId: 1 });

export default mongoose.model('Student', studentSchema);

import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide quiz title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  duration: {
    type: Number,
    required: [true, 'Please provide quiz duration in minutes'],
    min: 1
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 0
  },
  passingMarks: {
    type: Number,
    required: true,
    min: 0
  },
  questions: [{
    questionText: {
      type: String,
      required: true
    },
    questionType: {
      type: String,
      enum: ['mcq', 'true-false', 'short-answer'],
      required: true
    },
    options: [{
      type: String
    }],
    correctAnswer: mongoose.Schema.Types.Mixed, // Can be String or Array
    marks: {
      type: Number,
      required: true,
      min: 0
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    }
  }],
  allowTabSwitch: {
    type: Boolean,
    default: false
  },
  requireCamera: {
    type: Boolean,
    default: false
  },
  requireScreenShare: {
    type: Boolean,
    default: false
  },
  generatedByAI: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
quizSchema.index({ courseId: 1 });
quizSchema.index({ startTime: 1, endTime: 1 });

export default mongoose.model('Quiz', quizSchema);

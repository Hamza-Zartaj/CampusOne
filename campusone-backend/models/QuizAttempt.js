import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    answer: mongoose.Schema.Types.Mixed, // Can be String or Array
    isCorrect: {
      type: Boolean,
      default: false
    },
    marksObtained: {
      type: Number,
      default: 0
    }
  }],
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date,
    default: null
  },
  totalMarksObtained: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'terminated'],
    default: 'in-progress'
  },
  terminationReason: {
    type: String,
    enum: ['tab-switch', 'time-up', 'manual', 'violation'],
    default: null
  },
  tabSwitchCount: {
    type: Number,
    default: 0
  },
  proctoring: {
    cameraEnabled: {
      type: Boolean,
      default: false
    },
    screenShareEnabled: {
      type: Boolean,
      default: false
    },
    violations: [{
      type: {
        type: String,
        enum: ['tab-switch', 'camera-off', 'screen-share-off', 'multiple-faces', 'no-face'],
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      description: String
    }]
  }
}, {
  timestamps: true
});

// Indexes for faster queries
quizAttemptSchema.index({ quizId: 1 });
quizAttemptSchema.index({ studentId: 1 });

// Compound index to ensure unique attempt per student per quiz (if needed)
// Commented out to allow multiple attempts if required
// quizAttemptSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('QuizAttempt', quizAttemptSchema);

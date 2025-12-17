import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  fileUrl: {
    type: String,
    required: [true, 'Please provide submission file']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  marksObtained: {
    type: Number,
    min: 0,
    default: null
  },
  feedback: {
    type: String,
    trim: true
  },
  similarityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  similarityStatus: {
    type: String,
    enum: ['pending', 'acceptable', 'suspicious'],
    default: 'pending'
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  gradedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
submissionSchema.index({ assignmentId: 1 });
submissionSchema.index({ studentId: 1 });

// Compound index for unique submission per student per assignment
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('Submission', submissionSchema);

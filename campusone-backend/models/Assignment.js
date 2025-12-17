import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide assignment title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  dueDate: {
    type: Date,
    required: [true, 'Please provide due date']
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 0
  },
  lateSubmissionAllowed: {
    type: Boolean,
    default: false
  },
  fileUrl: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
assignmentSchema.index({ courseId: 1 });
assignmentSchema.index({ dueDate: 1 });

export default mongoose.model('Assignment', assignmentSchema);

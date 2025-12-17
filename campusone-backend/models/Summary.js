import mongoose from 'mongoose';

const summarySchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  originalFileUrl: {
    type: String,
    required: true
  },
  summaryText: {
    type: String,
    required: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
summarySchema.index({ courseId: 1 });
summarySchema.index({ generatedBy: 1 });

export default mongoose.model('Summary', summarySchema);

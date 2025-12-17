import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Please provide announcement title'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Please provide announcement content'],
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'teachers', 'specific_course'],
    default: 'all'
  }
}, {
  timestamps: true
});

// Index for faster queries
announcementSchema.index({ courseId: 1 });
announcementSchema.index({ createdAt: -1 });

export default mongoose.model('Announcement', announcementSchema);

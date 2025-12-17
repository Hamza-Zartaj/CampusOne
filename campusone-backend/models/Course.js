import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: [true, 'Please provide course code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  courseName: {
    type: String,
    required: [true, 'Please provide course name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  tas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TA'
  }],
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  semester: {
    type: String,
    required: true
  },
  creditHours: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  materials: [{
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['notes', 'slides', 'reading', 'video', 'other'],
      default: 'notes'
    },
    fileUrl: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
courseSchema.index({ courseCode: 1 });
courseSchema.index({ teacher: 1 });

export default mongoose.model('Course', courseSchema);

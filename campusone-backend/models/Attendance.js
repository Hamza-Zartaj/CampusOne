import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  records: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      required: true
    }
  }],
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
attendanceSchema.index({ courseId: 1, date: 1 });

// Compound index to ensure unique attendance record per course per date
attendanceSchema.index({ courseId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);

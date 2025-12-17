import mongoose from 'mongoose';

const teacherSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: [true, 'Please provide employee ID'],
    unique: true,
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Please provide department'],
    trim: true
  },
  designation: {
    type: String,
    enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Visiting Faculty'],
    default: 'Lecturer'
  },
  qualification: {
    type: String,
    trim: true
  },
  specialization: [{
    type: String,
    trim: true
  }],
  officeRoom: {
    type: String,
    trim: true
  },
  officeHours: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  extensionNumber: {
    type: String,
    trim: true
  },
  researchInterests: [{
    type: String,
    trim: true
  }],
  teachingCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    semester: String,
    year: Number
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
teacherSchema.index({ userId: 1 });
teacherSchema.index({ employeeId: 1 });

export default mongoose.model('Teacher', teacherSchema);

import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
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
    enum: ['System Administrator', 'Academic Officer', 'HOD', 'Dean', 'Administrator'],
    default: 'Administrator'
  },
  permissions: [{
    type: String,
    enum: [
      'manage_users',
      'manage_courses',
      'manage_assignments',
      'manage_attendance',
      'manage_announcements',
      'view_reports',
      'system_config',
      'manage_ta_eligibility',
      'manage_quiz'
    ]
  }],
  phone: {
    type: String,
    trim: true
  },
  officeRoom: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
adminSchema.index({ userId: 1 });
adminSchema.index({ employeeId: 1 });

export default mongoose.model('Admin', adminSchema);

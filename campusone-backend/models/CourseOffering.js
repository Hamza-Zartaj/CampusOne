import mongoose from 'mongoose';

const courseOfferingSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Please provide course']
  },
  academicYear: {
    type: String,
    required: [true, 'Please provide academic year'],
    trim: true
    // Format: "2025-2026"
  },
  semesterNumber: {
    type: Number,
    required: [true, 'Please provide semester number'],
    min: 1,
    max: 3
    // 1 = Fall/Odd, 2 = Spring/Even, 3 = Summer
  },
  semesterName: {
    type: String,
    enum: ['Fall', 'Spring', 'Summer', 'Winter', 'Odd', 'Even'],
    trim: true
  },
  section: {
    type: String,
    uppercase: true,
    trim: true,
    default: 'A'
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Please provide teacher']
  },
  tas: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TA'
  }],
  maxCapacity: {
    type: Number,
    default: 60,
    min: 1
  },
  currentEnrollment: {
    type: Number,
    default: 0,
    min: 0
  },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: {
      type: String,
      trim: true
      // Format: "09:00"
    },
    endTime: {
      type: String,
      trim: true
      // Format: "10:30"
    },
    room: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['lecture', 'lab', 'tutorial'],
      default: 'lecture'
    }
  }],
  materials: [{
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['notes', 'slides', 'reading', 'video', 'assignment', 'other'],
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
  enrollmentStatus: {
    type: String,
    enum: ['open', 'closed', 'waitlist'],
    default: 'open'
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
courseOfferingSchema.index({ course: 1 });
courseOfferingSchema.index({ academicYear: 1 });
courseOfferingSchema.index({ semesterNumber: 1 });
courseOfferingSchema.index({ teacher: 1 });
courseOfferingSchema.index({ academicYear: 1, semesterNumber: 1 });
courseOfferingSchema.index({ course: 1, academicYear: 1, semesterNumber: 1, section: 1 }, { unique: true });
courseOfferingSchema.index({ isDeleted: 1 });

// Query middleware to exclude soft-deleted documents by default
courseOfferingSchema.pre(/^find/, function(next) {
  if (this.getOptions().includeSoftDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Soft delete method
courseOfferingSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore method
courseOfferingSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

export default mongoose.model('CourseOffering', courseOfferingSchema);

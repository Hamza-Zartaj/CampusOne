import mongoose from 'mongoose';

const semesterInchargeSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Please provide teacher']
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: [true, 'Please provide program']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
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
    max: 12
  },
  batch: {
    type: String,
    required: [true, 'Please provide batch'],
    trim: true
    // e.g., "2023-2027"
  },
  responsibilities: [{
    type: String,
    trim: true
  }],
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'relieved'],
    default: 'active'
  },
  remarks: {
    type: String,
    trim: true
  },
  appointedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  appointedAt: {
    type: Date,
    default: Date.now
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
semesterInchargeSchema.index({ teacher: 1 });
semesterInchargeSchema.index({ program: 1 });
semesterInchargeSchema.index({ department: 1 });
semesterInchargeSchema.index({ academicYear: 1 });
semesterInchargeSchema.index({ semesterNumber: 1 });
semesterInchargeSchema.index({ batch: 1 });
semesterInchargeSchema.index({ status: 1 });
semesterInchargeSchema.index({ program: 1, batch: 1, academicYear: 1, semesterNumber: 1 }, { unique: true });
semesterInchargeSchema.index({ isDeleted: 1 });

// Query middleware to exclude soft-deleted documents by default
semesterInchargeSchema.pre(/^find/, function(next) {
  if (this.getOptions().includeSoftDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Soft delete method
semesterInchargeSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore method
semesterInchargeSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

export default mongoose.model('SemesterIncharge', semesterInchargeSchema);

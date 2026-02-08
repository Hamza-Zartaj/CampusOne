import mongoose from 'mongoose';

const programSchema = new mongoose.Schema({
  programCode: {
    type: String,
    required: [true, 'Please provide program code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please provide program name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please provide department']
  },
  type: {
    type: String,
    enum: ['Certificate', 'Diploma', 'Associate', 'Bachelor', 'Master', 'Doctorate', 'PostDoc'],
    required: [true, 'Please provide program type']
  },
  durationYears: {
    type: Number,
    required: [true, 'Please provide program duration in years'],
    min: 1,
    max: 10
  },
  totalSemesters: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  totalCredits: {
    type: Number,
    required: [true, 'Please provide total credits'],
    min: 1
  },
  eligibilityCriteria: {
    type: String,
    trim: true
  },
  // Curriculum structure: organized by semester
  curriculum: [{
    semesterNumber: {
      type: Number,
      required: true,
      min: 1
    },
    semesterName: {
      type: String,
      trim: true
      // e.g., "Fall Year 1", "Spring Year 2"
    },
    requiredCourses: [{
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
      },
      isCompulsory: {
        type: Boolean,
        default: true
      }
    }],
    electiveSlots: [{
      slotName: {
        type: String,
        trim: true
        // e.g., "Program Elective 1", "Open Elective"
      },
      domain: {
        type: String,
        trim: true
        // e.g., "Computer Science", "Mathematics", "Any"
      },
      category: {
        type: String,
        enum: ['program', 'department', 'open', 'discipline'],
        default: 'program'
      },
      minCredits: {
        type: Number,
        min: 0,
        default: 3
      },
      maxCredits: {
        type: Number,
        min: 0,
        default: 4
      },
      allowedCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
      }],
      description: {
        type: String,
        trim: true
      }
    }],
    minCredits: {
      type: Number,
      min: 0,
      default: 0
    },
    maxCredits: {
      type: Number,
      min: 0,
      default: 24
    },
    notes: {
      type: String,
      trim: true
    }
  }],
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
programSchema.index({ programCode: 1 });
programSchema.index({ department: 1 });
programSchema.index({ 'curriculum.semesterNumber': 1 });
programSchema.index({ isDeleted: 1 });

// Query middleware to exclude soft-deleted documents by default
programSchema.pre(/^find/, function(next) {
  if (this.getOptions().includeSoftDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Soft delete method
programSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore method
programSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

export default mongoose.model('Program', programSchema);

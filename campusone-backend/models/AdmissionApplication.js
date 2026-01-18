import mongoose from 'mongoose';

const admissionApplicationSchema = new mongoose.Schema({
  // Applicant Information
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    default: 'Prefer not to say'
  },
  
  // Address Information
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Educational Background
  previousEducation: {
    highSchool: {
      name: String,
      graduationYear: Number,
      gpa: Number
    },
    college: {
      name: String,
      degree: String,
      graduationYear: Number,
      gpa: Number
    }
  },
  
  // Program Details
  program: {
    type: String,
    required: true
  },
  preferredStartDate: {
    type: Date
  },
  
  // Documents
  documents: [{
    type: {
      type: String,
      required: true
    },
    url: String,
    fileName: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Additional Information
  personalStatement: {
    type: String,
    maxlength: 2000
  },
  references: [{
    name: String,
    email: String,
    phone: String,
    relationship: String
  }],
  
  // Application Status
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Accepted', 'Rejected', 'Waitlisted'],
    default: 'Pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: {
    type: String
  },
  
  // Tracking
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null if applicant doesn't have account yet
  },
  applicationNumber: {
    type: String,
    unique: true,
    required: true
  }
}, {
  timestamps: true
});

// Generate unique application number before saving
admissionApplicationSchema.pre('save', async function(next) {
  if (!this.applicationNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.applicationNumber = `APP${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Index for faster queries
admissionApplicationSchema.index({ email: 1 });
admissionApplicationSchema.index({ status: 1 });
admissionApplicationSchema.index({ submittedAt: -1 });

export default mongoose.model('AdmissionApplication', admissionApplicationSchema);

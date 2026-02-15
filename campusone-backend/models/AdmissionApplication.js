import mongoose from 'mongoose';

const admissionApplicationSchema = new mongoose.Schema({
  // Step 0: Personal Information
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
  cnic: {
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
  cnicFront: {
    type: String,
    default: null
  },
  cnicBack: {
    type: String,
    default: null
  },
  
  // Step 1: Guardian Information (Optional)
  guardian: {
    relation: String,   // Father, Mother, Guardian
    name: String,
    phone: String,
    cnic: String,
    cnicUpload: {
      type: String,
      default: null
    }
  },
  
  // Step 2: Address Information
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    nationality: {
      type: String,
      default: 'Pakistani'
    },
    domicileUpload: {
      type: String,
      default: null
    }
  },
  
  // Step 3: Educational Background - Array of education records
  educationRecords: [{
    level: {
      type: String,
      enum: ['Matric', 'O-Level', 'Intermediate', 'A-Level', "Bachelor's", "Master's", 'MPhil', 'PhD'],
      required: true
    },
    degreeName: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    board: {
      type: String,
      required: true
    },
    completionYear: {
      type: Number,
      required: true
    },
    resultType: {
      type: String,
      enum: ['Percentage', 'Marks', 'CGPA'],
      required: true
    },
    result: {
      type: String,
      required: true
    },
    transcript: {
      type: String,
      default: null
    },
    _id: false
  }],
  
  // Step 4: Program Details
  program: {
    type: String,
    required: true
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

// Index for faster queries and uniqueness
admissionApplicationSchema.index({ email: 1 }, { unique: true });
admissionApplicationSchema.index({ cnic: 1 }, { unique: true });
admissionApplicationSchema.index({ phone: 1 }, { unique: true });
admissionApplicationSchema.index({ status: 1 });
admissionApplicationSchema.index({ submittedAt: -1 });

// Generate unique application number BEFORE validation
admissionApplicationSchema.pre('validate', async function() {
  if (!this.applicationNumber) {
    try {
      const year = new Date().getFullYear();
      const count = await mongoose.model('AdmissionApplication').countDocuments();
      this.applicationNumber = `APP${year}${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating application number:', error);
      // Fallback: generate using timestamp if count fails
      this.applicationNumber = `APP${Date.now()}`;
    }
  }
});

export default mongoose.model('AdmissionApplication', admissionApplicationSchema);

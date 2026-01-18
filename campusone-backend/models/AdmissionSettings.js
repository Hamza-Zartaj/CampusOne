import mongoose from 'mongoose';

const admissionSettingsSchema = new mongoose.Schema({
  isOpen: {
    type: Boolean,
    default: false,
    required: true
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  applicationFormFields: {
    type: [String],
    default: ['fullName', 'email', 'phone', 'address', 'dateOfBirth', 'previousEducation', 'program']
  },
  instructions: {
    type: String,
    default: 'Please fill out the admission application form with accurate information.'
  },
  maxApplications: {
    type: Number,
    default: null // null means unlimited
  },
  requiresDocuments: {
    type: Boolean,
    default: true
  },
  requiredDocuments: {
    type: [String],
    default: ['transcript', 'idProof', 'photo']
  },
  notificationEmails: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
admissionSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Check if admissions are currently open
admissionSettingsSchema.methods.isCurrentlyOpen = function() {
  if (!this.isOpen) return false;
  
  const now = new Date();
  
  // If start date is set and current time is before start date
  if (this.startDate && now < this.startDate) return false;
  
  // If end date is set and current time is after end date
  if (this.endDate && now > this.endDate) return false;
  
  return true;
};

export default mongoose.model('AdmissionSettings', admissionSettingsSchema);

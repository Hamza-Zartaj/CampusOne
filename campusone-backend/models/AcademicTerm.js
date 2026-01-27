import mongoose from 'mongoose';

/**
 * AcademicTerm Schema - Represents academic terms (Fall, Spring, Summer)
 */
const academicTermSchema = new mongoose.Schema({
  termType: {
    type: String,
    required: true,
    enum: ['fall', 'spring', 'summer']
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100
  },
  // Term name (auto-generated or custom)
  name: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  // Registration dates
  registrationStartDate: {
    type: Date
  },
  registrationEndDate: {
    type: Date
  },
  // Add/Drop period
  addDropDeadline: {
    type: Date
  },
  // Withdrawal deadline
  withdrawalDeadline: {
    type: Date
  },
  // Is this the current active term?
  isCurrent: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save hook to generate term name
academicTermSchema.pre('save', async function() {
  if (!this.name) {
    const termTypeCapitalized = this.termType.charAt(0).toUpperCase() + this.termType.slice(1);
    this.name = `${termTypeCapitalized} ${this.year}`;
  }
});

// Compound unique index for term type and year
academicTermSchema.index({ termType: 1, year: 1 }, { unique: true });
academicTermSchema.index({ isCurrent: 1 });

// Static method to get current term
academicTermSchema.statics.getCurrentTerm = async function() {
  return await this.findOne({ isCurrent: true, isActive: true });
};

// Static method to set current term (unsets others)
academicTermSchema.statics.setCurrentTerm = async function(termId) {
  await this.updateMany({}, { isCurrent: false });
  return await this.findByIdAndUpdate(termId, { isCurrent: true }, { new: true });
};

export default mongoose.model('AcademicTerm', academicTermSchema);

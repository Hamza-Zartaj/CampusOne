import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false // Don't return password by default
  },
  role: {
    type: String,
    required: true,
    enum: ['student', 'teacher', 'ta', 'admin'],
    default: 'student'
  },
  profilePicture: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  accountLockedUntil: {
    type: Date,
    default: null
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  trustedDevices: [{
    deviceId: {
      type: String,
      required: true
    },
    deviceName: {
      type: String,
      required: true
    },
    ipAddress: String,
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  lastLogin: {
    type: Date,
    default: null
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  passwordChangedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  if (this.accountLocked && this.accountLockedUntil) {
    // Check if lock period has expired
    if (this.accountLockedUntil > Date.now()) {
      return true;
    }
    // Auto-unlock if time has passed
    this.accountLocked = false;
    this.accountLockedUntil = null;
    this.failedLoginAttempts = 0;
    this.save();
    return false;
  }
  return this.accountLocked;
};

export default mongoose.model('User', userSchema);

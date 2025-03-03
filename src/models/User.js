import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { ROLES } from '../constants/roles.js';
import { generatePasswordResetToken } from '../utils/generateToken.js';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    required: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  biometricLoginEnabled: {
    type: Boolean,
    default: false
  },

  verificationToken: String,
  verificationTokenUsed: {
    type: Boolean,
    default: false
  },
  verificationCode: String,
  verificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  
  // Restaurant specific fields
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant', 
    default: null
  },

  restaurantName: {
    type: String,
    required: function() { return this.role === ROLES.RESTAURANT; }
  },
  location: {
    type: String,
    required: function() { return this.role === ROLES.RESTAURANT; }
  },
  contactNumber: {
    type: String,
    required: function() { return this.role === ROLES.RESTAURANT; }
  },
  
  subscriptionPro: {
    type: Boolean,
    default: false
  },
  subscriptionAmount: {
    type: Number,
    default: 0
  },
  subscriptionStartDate: {
    type: Date
  },
  quote: {
    type: String,
    required: function() { return this.role === ROLES.RESTAURANT; }
  },

  hours: {
    type: String,
    default: 'Mon-Sat: 11:00 AM - 10:00 PM'
  },

  image: {
    type: String,
    validate: {
      validator: function(v) {
        // Basic URL validation
        if (!v) return true; // Allow empty
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  },
  coverImage: {
    type: String,
    validate: {
      validator: function(v) {
        // Basic URL validation
        if (!v) return true; // Allow empty
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  },

  // Status management
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: function() {
      return this.role === ROLES.RESTAURANT ? 'pending' : undefined;
    }
  },
  lastStatusUpdate: Date,
  statusUpdateReason: String,
  
  // Admin fields
  adminCode: {
    type: String,
    select: false,
    sparse: true
  }
}, {
  timestamps: true
});

// Document methods
userSchema.methods.generateVerificationToken = function() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  this.verificationToken = hashedToken;
  this.verificationTokenUsed = false;
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

  return rawToken;
};

userSchema.methods.generateVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');

  this.verificationCode = hashedCode;
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  
  return code;
};

userSchema.methods.generatePasswordResetToken = function() {
  const { resetToken, hashedToken, expires } = generatePasswordResetToken();
  this.passwordResetToken = hashedToken;
  this.passwordResetExpires = expires;
  return resetToken;
};

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
export default User;
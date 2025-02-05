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
  verificationToken: {
    type: String,
    select: false
  },
  verificationTokenUsed: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    select: false
  },
  verificationExpires: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  lastLogin: Date,
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
  adminCode: {
    type: String,
    select: false,
    sparse: true
  },
  quote: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: function() {
      return this.role === ROLES.RESTAURANT ? 'pending' : undefined;
    }
  },
  lastStatusUpdate: {
    type: Date
  },
  statusUpdateReason: {
    type: String
  }
}, {
  timestamps: true
});

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

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// MongoDB will automatically create indexes for unique fields
// No need to explicitly create indexes here

export const User = mongoose.model('User', userSchema);
export default User;
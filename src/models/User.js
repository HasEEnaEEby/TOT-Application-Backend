// src/models/User.js
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import crypto from 'node:crypto';

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
    enum: ['customer', 'restaurant'],
    required: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  verificationToken: String,
  verificationCode: String,  
  verificationExpires: Date,

  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  restaurantName: {
    type: String,
    required: function() { return this.role === 'restaurant'; }
  },
  location: {
    type: String,
    required: function() { return this.role === 'restaurant'; }
  },
  contactNumber: {
    type: String,
    required: function() { return this.role === 'restaurant'; }
  },
  quote: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: function() {
      return this.role === 'restaurant' ? 'pending' : undefined;
    }
  }
}, {
  timestamps: true
});

userSchema.methods.generateVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return verificationToken;
};

userSchema.methods.generateVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationCode = code;
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return code;
};

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
export default User;
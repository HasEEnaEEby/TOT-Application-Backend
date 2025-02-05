import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { Schema, model } from 'mongoose';

const menuItemSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  category: { type: String },
});

const restaurantSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    owner: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true
    },
    quote: {
      type: String,
      trim: true
    },
    menu: [menuItemSchema],
    lastStatusUpdate: {
      type: Date
    },
    statusUpdateReason: {
      type: String
    },
    adminCode: {
      type: String,
      select: false,
    },
    adminCodeHash: {
      type: String,
      select: false
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Methods for admin code handling
restaurantSchema.methods.generateAdminCode = async function() {
  const adminCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  this.adminCode = adminCode;
  this.adminCodeHash = await bcryptjs.hash(adminCode, 12);
  return adminCode;
};

restaurantSchema.methods.verifyAdminCode = async function(providedCode) {
  if (!this.adminCodeHash) return false;
  return await bcryptjs.compare(providedCode, this.adminCodeHash);
};

// Pre-save middleware
restaurantSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'approved') {
    this.lastStatusUpdate = new Date();
  }
  next();
});

// Create indexes
restaurantSchema.index({ owner: 1 });

// Virtual populate
restaurantSchema.virtual('ownerDetails', {
  ref: 'User',
  localField: 'owner',
  foreignField: '_id',
  justOne: true
});

const Restaurant = model('Restaurant', restaurantSchema);

export default Restaurant;
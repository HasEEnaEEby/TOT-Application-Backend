import crypto from 'crypto';
import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantManagement',
    required: [true, 'Table must belong to a restaurant']
  },
  number: {
    type: Number,
    required: [true, 'Table number is required'],
    min: [1, 'Table number must be greater than 0']
  },
  capacity: {
    type: Number,
    required: [true, 'Table capacity is required'],
    min: [1, 'Table capacity must be at least 1']
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'unavailable'],
    default: 'available'
  },
  position: {
    x: {
      type: Number,
      required: [true, 'X coordinate is required']
    },
    y: {
      type: Number,
      required: [true, 'Y coordinate is required']
    }
  },
  qrCode: {
    token: {
      type: String,
      default: function() {
        return crypto.randomBytes(32).toString('hex');
      }
    },
    expiresAt: {
      type: Date,
      default: function() {
        // QR Code expires in 24 hours by default
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
    },
    isValid: {
      type: Boolean,
      default: true
    }
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure table numbers are unique per restaurant
tableSchema.index({ restaurant: 1, number: 1 }, { unique: true });

// Method to refresh the QR code token
tableSchema.methods.refreshQRCode = function() {
  this.qrCode.token = crypto.randomBytes(32).toString('hex');
  this.qrCode.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  this.qrCode.isValid = true;
  return this.save();
};

// Method to validate a QR code
tableSchema.methods.validateQRCode = function(token) {
  return (
    this.qrCode.token === token &&
    this.qrCode.isValid &&
    this.qrCode.expiresAt > Date.now()
  );
};

// Method to invalidate a QR code (e.g., after use)
tableSchema.methods.invalidateQRCode = function() {
  this.qrCode.isValid = false;
  return this.save();
};

// Update lastUpdated timestamp on modifications
tableSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

tableSchema.pre('findOneAndUpdate', function(next) {
  this.set({ lastUpdated: new Date() });
  next();
});

export const Table = mongoose.model('Table', tableSchema);

export default Table;
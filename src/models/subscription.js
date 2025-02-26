// src/models/subscription.js
import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planType: {
    type: String,
    enum: ['basic', 'premium'],
    default: 'basic'
  },
  startDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  monthlyFee: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Add index for efficient queries
subscriptionSchema.index({ expiryDate: 1 });
subscriptionSchema.index({ paymentStatus: 1 });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
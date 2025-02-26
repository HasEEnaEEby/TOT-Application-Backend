// RestaurantImage.js - model for restaurant images
import mongoose from 'mongoose';

const restaurantImageSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageType: {
    type: String,
    enum: ['profile', 'banner', 'menu', 'gallery'],
    default: 'profile'
  },
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  width: Number,
  height: Number,
  format: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Only allow one active profile image per restaurant
restaurantImageSchema.index({ restaurant: 1, imageType: 1, isActive: 1 }, { 
  unique: true,
  partialFilterExpression: { isActive: true, imageType: 'profile' }
});

export const RestaurantImage = mongoose.model('RestaurantImage', restaurantImageSchema);
export default RestaurantImage;
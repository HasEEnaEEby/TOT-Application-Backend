const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  ingredients: [String],
  dietaryTags: [String],
  image: String,
  available: { type: Boolean, default: true },
  specialInstructions: String,
  ratings: [Number],
  reviews: [String]
}, {
  timestamps: true,
});

module.exports = mongoose.model('Menu', menuSchema);

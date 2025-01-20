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
  },
  { timestamps: true }
);

const Restaurant = model('Restaurant', restaurantSchema);

export default Restaurant;
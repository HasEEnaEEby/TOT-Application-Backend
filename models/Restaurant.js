const mongoose = require('mongoose');
const { hashPassword, comparePassword } = require('../utils/passwordUtils'); 

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,  
    required: true,
  },
  restaurant_status: {
    type: String,
    default: 'Inactive',
  },
  logo: String,  
  menu: Array,   
}, {
  timestamps: true,
});

restaurantSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); 
  this.password = await hashPassword(this.password);  
  next();
});

restaurantSchema.methods.matchPassword = async function (enteredPassword) {
  return await comparePassword(enteredPassword, this.password);  
};

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;

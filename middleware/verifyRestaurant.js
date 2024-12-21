const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');
const AppError = require('../utils/AppError');

const verifyRestaurant = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]; 

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      console.log('Decoded Token in verifyRestaurant:', decoded);

      const restaurant = await Restaurant.findById(decoded.restaurantId);
      if (!restaurant) {
        return next(new AppError('Restaurant not found', 404));
      }
      req.restaurant = restaurant;
      next();
    } catch (error) {
      console.error('Verification Error:', error.message); 
      return next(new AppError('Authorization failed', 401));
    }
  }

  if (!token) {
    return next(new AppError('Not authorized, no token', 401));
  }
};

module.exports = { verifyRestaurant };

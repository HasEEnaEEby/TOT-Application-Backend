const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]; 

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.restaurantId) {
        const restaurant = await Restaurant.findById(decoded.restaurantId);
        if (restaurant) {
          req.restaurant = restaurant;  
          return next();  
        }
      } 
      else if (decoded.role === 'customer' || decoded.id) {
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
          return next();  
        }
      }

      throw new AppError('Not authorized, no matching user or restaurant found', 401);
    } catch (error) {
      console.error('Token Error:', error.message);
      return next(new AppError('Not authorized, token failed', 401));
    }
  }

  if (!token) {
    return next(new AppError('Not authorized, no token', 401));
  }
};

module.exports = { protect };

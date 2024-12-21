const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const payload = { id: user._id };

  if (user.restaurantId) {
    payload.restaurantId = user.restaurantId;
  } else if (user.role === 'customer') {
    payload.role = user.role;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d', 
  });
};

module.exports = generateToken;

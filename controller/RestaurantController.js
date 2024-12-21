const restaurantService = require('../services/restaurantService');
const AppError = require('../utils/AppError');

exports.createRestaurant = async (req, res, next) => {
  try {
    const restaurantData = req.body;
    const newRestaurant = await restaurantService.createRestaurant(restaurantData);

    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully, but still inactive. Login to activate your account.',
      restaurant: {
        id: newRestaurant._id,
        name: newRestaurant.name,
        email: newRestaurant.email,
        restaurant_status: newRestaurant.restaurant_status,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.loginRestaurant = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Log the incoming request body
    console.log('Login Request Body:', { email, password });

    const { restaurant, token } = await restaurantService.loginRestaurant(email, password);

    res.status(200).json({
      success: true,
      message: 'Restaurant logged in successfully. You are now active.',
      token,
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        email: restaurant.email,
        restaurant_status: 'Active',
      },
    });
  } catch (err) {
    console.error('Error during login:', err);
    next(err);
  }
};


// Placeholder function for fetching all restaurants
exports.getAllRestaurants = async (req, res, next) => {
  try {
    const restaurants = await restaurantService.getAllRestaurants(); // Update service logic as needed
    res.status(200).json({
      success: true,
      restaurants,
    });
  } catch (err) {
    next(err);
  }
};

// Placeholder function for updating a restaurant's logo
exports.updateRestaurantLogo = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const logoData = req.body.logo; // Assume logo is sent as part of the request body

    const updatedRestaurant = await restaurantService.updateRestaurantLogo(restaurantId, logoData); // Update service logic as needed
    res.status(200).json({
      success: true,
      message: 'Restaurant logo updated successfully.',
      restaurant: updatedRestaurant,
    });
  } catch (err) {
    next(err);
  }
};

// Placeholder function for updating a restaurant's password
exports.updateRestaurantPassword = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { oldPassword, newPassword } = req.body;

    await restaurantService.updateRestaurantPassword(restaurantId, oldPassword, newPassword); // Update service logic as needed
    res.status(200).json({
      success: true,
      message: 'Restaurant password updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

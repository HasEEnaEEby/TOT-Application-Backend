const Menu = require('../models/Menu');
const Restaurant = require('../models/Restaurant');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const getMenuForRestaurant = async (restaurantId) => {
  const menu = await Menu.find({ restaurantId });
  if (!menu || menu.length === 0) {
    throw new AppError('No menu items found for this restaurant', 404);
  }
  return menu;
};

const createRestaurant = async (restaurantData) => {
  const { email, password } = restaurantData;

  if (!password) {
    throw new AppError('Password is required', 400);
  }

  const existingRestaurant = await Restaurant.findOne({ email });
  if (existingRestaurant) {
    throw new AppError('Restaurant already exists', 400);
  }

  const newRestaurant = new Restaurant(restaurantData);

  await newRestaurant.save();
  return newRestaurant;
};

const loginRestaurant = async (email, password) => {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const restaurant = await Restaurant.findOne({ email });

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  const isMatch = await restaurant.matchPassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = jwt.sign({ restaurantId: restaurant._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

  return { restaurant, token };
};

const getAllRestaurants = async () => {
  const restaurants = await Restaurant.find().select('-password');
  if (!restaurants || restaurants.length === 0) {
    throw new AppError('No restaurants found', 404);
  }
  return restaurants;
};

const updateRestaurantLogo = async (restaurantId, logoData) => {
  const restaurant = await Restaurant.findByIdAndUpdate(
    restaurantId,
    { logo: logoData },
    { new: true }
  );
  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }
  return restaurant;
};

const updateRestaurantPassword = async (restaurantId, oldPassword, newPassword) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  const isMatch = await restaurant.matchPassword(oldPassword);
  if (!isMatch) {
    throw new AppError('Old password is incorrect', 401);
  }

  restaurant.password = newPassword;
  await restaurant.save();

  return { message: 'Password updated successfully' };
};

const updateRestaurantMenu = async (restaurantId, newMenu) => {
  const restaurant = await Restaurant.findByIdAndUpdate(
    restaurantId,
    { menu: newMenu },
    { new: true }
  );
  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }
  return restaurant.menu;
};

module.exports = {
  getMenuForRestaurant,
  createRestaurant,
  loginRestaurant,
  getAllRestaurants,
  updateRestaurantLogo,
  updateRestaurantPassword,
  updateRestaurantMenu,
};

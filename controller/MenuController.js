import Menu, { find, findByIdAndDelete, findByIdAndUpdate, findOne } from '../models/Menu.js';
import { findById } from '../models/Restaurant.js';
import AppError from '../utils/AppError.js';

// Create or Update a Menu item
const createOrUpdateMenu = async (req, res, next) => {
  const { name, description, price, category, ingredients, dietaryTags, image, available, specialInstructions } = req.body;
  const { restaurantId } = req.params;

  const restaurant = await findById(restaurantId);
  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const existingMenu = await findOne({ restaurantId, name });
  if (existingMenu) {
    return next(new AppError('Menu item already exists for this restaurant', 400));
  }

  const newMenu = new Menu({
    restaurantId,
    name,
    description,
    price,
    category,
    ingredients,
    dietaryTags,
    image,
    available,
    specialInstructions,
  });

  await newMenu.save();

  res.status(201).json({
    success: true,
    message: 'Menu item created successfully!',
    data: newMenu,
  });
};

// Fetch the menu for a specific restaurant
const getMenu = async (req, res, next) => {
  const { restaurantId } = req.params;

  const menu = await find({ restaurantId });
  if (!menu) {
    return next(new AppError('Menu not found for this restaurant', 404));
  }

  res.status(200).json({
    success: true,
    data: menu,
  });
};

// Update a Menu item
const updateMenu = async (req, res, next) => {
  const { menuId } = req.params;
  const updatedData = req.body;

  const updatedMenu = await findByIdAndUpdate(menuId, updatedData, { new: true });

  if (!updatedMenu) {
    return next(new AppError('Menu item not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Menu item updated successfully!',
    data: updatedMenu,
  });
};

// Delete a Menu item
const deleteMenu = async (req, res, next) => {
  const { menuId } = req.params;

  const deletedMenu = await findByIdAndDelete(menuId);

  if (!deletedMenu) {
    return next(new AppError('Menu item not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Menu item deleted successfully!',
  });
};

export default {
  createOrUpdateMenu,
  getMenu,
  updateMenu,
  deleteMenu,
};

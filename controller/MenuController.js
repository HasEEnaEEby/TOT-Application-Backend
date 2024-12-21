const Menu = require('../models/Menu');
const Restaurant = require('../models/Restaurant');
const AppError = require('../utils/AppError');

// Create or Update a Menu item
const createOrUpdateMenu = async (req, res, next) => {
  const { name, description, price, category, ingredients, dietaryTags, image, available, specialInstructions } = req.body;
  const { restaurantId } = req.params;

  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404));
  }

  const existingMenu = await Menu.findOne({ restaurantId, name });
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

  const menu = await Menu.find({ restaurantId });
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

  const updatedMenu = await Menu.findByIdAndUpdate(menuId, updatedData, { new: true });

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

  const deletedMenu = await Menu.findByIdAndDelete(menuId);

  if (!deletedMenu) {
    return next(new AppError('Menu item not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Menu item deleted successfully!',
  });
};

module.exports = {
  createOrUpdateMenu,
  getMenu,
  updateMenu,
  deleteMenu,
};

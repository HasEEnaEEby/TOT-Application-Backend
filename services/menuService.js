const Menu = require('../models/Menu');

const createMenuItem = async (restaurantId, menuData) => {
  const newMenu = new Menu({
    restaurantId,
    ...menuData,
  });

  await newMenu.save();
  return newMenu;
};

const getMenuItems = async (restaurantId) => {
  return await Menu.find({ restaurantId });
};

const updateMenuItem = async (menuId, updatedData) => {
  return await Menu.findByIdAndUpdate(menuId, updatedData, { new: true });
};

const deleteMenuItem = async (menuId) => {
  return await Menu.findByIdAndDelete(menuId);
};

module.exports = { createMenuItem, getMenuItems, updateMenuItem, deleteMenuItem };

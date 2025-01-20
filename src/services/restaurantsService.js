import Restaurant from '../models/Restaurant.js';
import AppError from '../utils/AppError.js';

export const addMenuItem = async (restaurantId, menuItemData) => {
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) throw new AppError('Restaurant not found.', 404);

    restaurant.menu.push(menuItemData);
    await restaurant.save();
    return menuItemData;
};

export const getMenuItems = async (restaurantId) => {
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) throw new AppError('Restaurant not found.', 404);

    return restaurant.menu;
};

export const updateMenuItem = async (restaurantId, menuItemId, updateData) => {
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) throw new AppError('Restaurant not found.', 404);

    const menuItem = restaurant.menu.id(menuItemId);
    if (!menuItem) throw new AppError('Menu item not found.', 404);

    Object.assign(menuItem, updateData);
    await restaurant.save();
    return menuItem;
};

export const deleteMenuItem = async (restaurantId, menuItemId) => {
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) throw new AppError('Restaurant not found.', 404);

    const menuItem = restaurant.menu.id(menuItemId);
    if (!menuItem) throw new AppError('Menu item not found.', 404);

    menuItem.remove();
    await restaurant.save();
};

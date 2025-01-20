import * as restaurantService from '../services/restaurantsService.js';
import AppError from '../utils/AppError.js';

export const addMenuItem = async (req, res, next) => {
    try {
        const { name, price, description, category } = req.body;
        const restaurantId = req.user.restaurant;

        if (!restaurantId) return next(new AppError('Unauthorized access.', 403));

        const menuItemData = { name, price, description, category };
        const newMenuItem = await restaurantService.addMenuItem(restaurantId, menuItemData);

        res.status(201).json({
            status: 'success',
            data: { menuItem: newMenuItem },
        });
    } catch (error) {
        next(error);
    }
};

export const getMenuItems = async (req, res, next) => {
    try {
        const restaurantId = req.user.restaurant;

        if (!restaurantId) return next(new AppError('Unauthorized access.', 403));

        const menu = await restaurantService.getMenuItems(restaurantId);

        res.status(200).json({
            status: 'success',
            data: { menu },
        });
    } catch (error) {
        next(error);
    }
};

// Update a menu item
export const updateMenuItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurant;
        const updateData = req.body;

        if (!restaurantId) return next(new AppError('Unauthorized access.', 403));

        const updatedMenuItem = await restaurantService.updateMenuItem(restaurantId, id, updateData);

        res.status(200).json({
            status: 'success',
            data: { menuItem: updatedMenuItem },
        });
    } catch (error) {
        next(error);
    }
};

export const deleteMenuItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurantId = req.user.restaurant;

        if (!restaurantId) return next(new AppError('Unauthorized access.', 403));

        await restaurantService.deleteMenuItem(restaurantId, id);

        res.status(204).json({
            status: 'success',
            message: 'Menu item deleted successfully.',
        });
    } catch (error) {
        next(error);
    }
};

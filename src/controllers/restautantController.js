import * as restaurantService from '../services/restaurantsService.js';
import AppError from '../utils/AppError.js';

// Restaurant Approval Management
export const approveRestaurant = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const restaurant = await restaurantService.updateRestaurantStatus(id, 'approved');
        
        if (!restaurant) {
            return next(new AppError('Restaurant request not found', 404));
        }

        res.status(200).json({
            status: 'success',
            message: 'Restaurant approved successfully',
            data: { restaurant }
        });
    } catch (error) {
        next(error);
    }
};

export const rejectRestaurant = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const restaurant = await restaurantService.updateRestaurantStatus(id, 'rejected');
        
        if (!restaurant) {
            return next(new AppError('Restaurant request not found', 404));
        }

        res.status(200).json({
            status: 'success',
            message: 'Restaurant rejected successfully',
            data: { restaurant }
        });
    } catch (error) {
        next(error);
    }
};

export const bulkApprove = async (req, res, next) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return next(new AppError('Invalid request: ids array required', 400));
        }

        const result = await restaurantService.bulkUpdateStatus(ids, 'approved');

        res.status(200).json({
            status: 'success',
            message: `${result.modifiedCount} restaurants approved successfully`
        });
    } catch (error) {
        next(error);
    }
};

export const bulkReject = async (req, res, next) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return next(new AppError('Invalid request: ids array required', 400));
        }

        const result = await restaurantService.bulkUpdateStatus(ids, 'rejected');

        res.status(200).json({
            status: 'success',
            message: `${result.modifiedCount} restaurants rejected successfully`
        });
    } catch (error) {
        next(error);
    }
};

// Menu Item Management
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

// Get Restaurant Status
export const getRestaurantStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const restaurant = await restaurantService.getRestaurantById(id);
        
        if (!restaurant) {
            return next(new AppError('Restaurant not found', 404));
        }

        res.status(200).json({
            status: 'success',
            data: {
                status: restaurant.status,
                restaurantName: restaurant.restaurantName,
                location: restaurant.location
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get Pending Restaurant Requests
export const getPendingRestaurants = async (req, res, next) => {
    try {
        const pendingRestaurants = await restaurantService.getPendingRestaurants();

        res.status(200).json({
            status: 'success',
            data: { restaurants: pendingRestaurants }
        });
    } catch (error) {
        next(error);
    }
};
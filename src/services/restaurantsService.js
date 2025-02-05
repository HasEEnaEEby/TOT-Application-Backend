import MenuItem from '../models/MenuItem.js';
import Restaurant from '../models/Restaurant.js';
import AppError from '../utils/AppError.js';
import { sendApprovalEmail, sendRejectionEmail } from '../utils/email.js';


export const updateRestaurantStatus = async (id, status) => {
    const restaurant = await Restaurant.findByIdAndUpdate(
        id,
        { 
            status,
            updatedAt: new Date()
        },
        { new: true }
    );

    if (!restaurant) {
        throw new AppError('Restaurant not found', 404);
    }

    // Send email notification
    if (status === 'approved') {
        await sendApprovalEmail(restaurant.email, restaurant.restaurantName);
    } else if (status === 'rejected') {
        await sendRejectionEmail(restaurant.email, restaurant.restaurantName);
    }

    return restaurant;
};

export const bulkUpdateStatus = async (ids, status) => {
    const result = await Restaurant.updateMany(
        { 
            _id: { $in: ids },
            status: 'pending' // Only update pending requests
        },
        { 
            status,
            updatedAt: new Date()
        }
    );

    // Send emails
    const restaurants = await Restaurant.find({ _id: { $in: ids } });
    await Promise.all(
        restaurants.map(restaurant => {
            if (status === 'approved') {
                return sendApprovalEmail(restaurant.email, restaurant.restaurantName);
            } else {
                return sendRejectionEmail(restaurant.email, restaurant.restaurantName);
            }
        })
    );

    return result;
};

export const addMenuItem = async (restaurantId, menuItemData) => {
    const menuItem = new MenuItem({
        ...menuItemData,
        restaurant: restaurantId
    });
    
    await menuItem.save();
    return menuItem;
};

export const getMenuItems = async (restaurantId) => {
    return await MenuItem.find({ restaurant: restaurantId });
};

export const updateMenuItem = async (restaurantId, menuItemId, updateData) => {
    const menuItem = await MenuItem.findOneAndUpdate(
        { _id: menuItemId, restaurant: restaurantId },
        updateData,
        { new: true }
    );

    if (!menuItem) {
        throw new AppError('Menu item not found or unauthorized', 404);
    }

    return menuItem;
};

export const deleteMenuItem = async (restaurantId, menuItemId) => {
    const menuItem = await MenuItem.findOneAndDelete({
        _id: menuItemId,
        restaurant: restaurantId
    });

    if (!menuItem) {
        throw new AppError('Menu item not found or unauthorized', 404);
    }

    return menuItem;
};

export const getRestaurantById = async (id) => {
    return await Restaurant.findById(id);
};

export const getPendingRestaurants = async () => {
    return await Restaurant.find({ status: 'pending' })
        .sort({ createdAt: -1 });
};
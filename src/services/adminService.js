import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import emailService from './emailservices.js';

export class AdminService {
  static async getPendingRestaurants() {
    try {
      return await User.find({
        role: 'restaurant',
        status: 'pending'
      }).select('-password');
    } catch (error) {
      logger.error('Error fetching pending restaurants:', error);
      throw new AppError('Failed to fetch pending restaurants', 500);
    }
  }

  static async updateRestaurantStatus(restaurantId, newStatus) {
    try {
      const restaurant = await User.findOneAndUpdate(
        { _id: restaurantId, role: 'restaurant' },
        { status: newStatus },
        { new: true }
      );

      if (!restaurant) {
        throw new AppError('Restaurant not found', 404);
      }

      return restaurant;
    } catch (error) {
      logger.error('Error updating restaurant status:', error);
      throw error;
    }
  }

  static async bulkUpdateRestaurantStatus(restaurantIds, newStatus) {
    try {
      const result = await User.updateMany(
        { 
          _id: { $in: restaurantIds },
          role: 'restaurant',
          status: 'pending'
        },
        { status: newStatus }
      );

      return result.modifiedCount;
    } catch (error) {
      logger.error('Error bulk updating restaurant status:', error);
      throw new AppError('Failed to update restaurants', 500);
    }
  }
}

export default AdminService;
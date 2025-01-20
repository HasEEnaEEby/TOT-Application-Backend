// src/controllers/adminController.js
import { AdminService } from '../services/adminService.js';
import emailService from '../services/emailservices.js';
import logger from '../utils/logger.js';
import AppError from '../utils/AppError.js';

export const adminController = {
  getPendingRestaurants: async (req, res, next) => {
    try {
      const restaurants = await AdminService.getPendingRestaurants();

      res.status(200).json({
        status: 'success',
        data: restaurants.map(r => ({
          id: r._id,
          restaurantName: r.restaurantName,
          username: r.username,
          email: r.email,
          location: r.location,
          createdAt: r.createdAt,
          status: r.status,
          quote: r.quote,
          contactNumber: r.contactNumber
        }))
      });
    } catch (error) {
      logger.error('Error fetching pending restaurants:', {
        error: error.message,
        adminId: req.user._id
      });
      next(error);
    }
  },

  approveRestaurant: async (req, res, next) => {
    try {
      const { id } = req.params;
      const restaurant = await AdminService.updateRestaurantStatus(id, 'approved');

      await emailService.sendEmail({
        to: restaurant.email,
        subject: 'TOT Restaurant Application Approved! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #22c55e;">Congratulations!</h2>
            <p>Your restaurant "${restaurant.restaurantName}" has been approved on TOT!</p>
            <div style="margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/login" 
                 style="background-color: #22c55e; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Login to Dashboard
              </a>
            </div>
          </div>
        `
      });

      res.status(200).json({
        status: 'success',
        message: 'Restaurant approved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  rejectRestaurant: async (req, res, next) => {
    try {
      const { id } = req.params;
      const restaurant = await AdminService.updateRestaurantStatus(id, 'rejected');

      await emailService.sendEmail({
        to: restaurant.email,
        subject: 'Update on Your TOT Restaurant Application',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Application Status Update</h2>
            <p>Thank you for your interest in joining TOT.</p>
            <p>After review, we are unable to approve your application at this time.</p>
            <p>You may submit a new application after 30 days.</p>
          </div>
        `
      });

      res.status(200).json({
        status: 'success',
        message: 'Restaurant rejected successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  bulkApproveRestaurants: async (req, res, next) => {
    try {
      const { ids } = req.body;
      await AdminService.bulkUpdateRestaurantStatus(ids, 'approved');

      res.status(200).json({
        status: 'success',
        message: 'Restaurants approved successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  bulkRejectRestaurants: async (req, res, next) => {
    try {
      const { ids } = req.body;
      await AdminService.bulkUpdateRestaurantStatus(ids, 'rejected');

      res.status(200).json({
        status: 'success',
        message: 'Restaurants rejected successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};

export default adminController;
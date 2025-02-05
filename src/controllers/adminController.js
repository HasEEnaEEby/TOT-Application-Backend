import mongoose from 'mongoose';
import { AdminService } from '../services/adminService.js';
import emailService from '../services/emailservices.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export const adminController = {
  getPendingRestaurants: catchAsync(async (req, res) => {
    logger.info('Fetching pending restaurants', { 
      adminId: req.user._id,
      requestId: req.id 
    });

    const restaurants = await AdminService.getPendingRestaurants();

    res.status(200).json({
      status: 'success',
      data: restaurants.map(r => ({
        id: r._id,
        email: r.email,
        username: r.username,
        status: r.status,
        restaurantName: r.restaurantName,
        location: r.location,
        contactNumber: r.contactNumber,
        quote: r.quote,
        createdAt: r.createdAt
      }))
    });
  }),

  approveRestaurant: catchAsync(async (req, res) => {
    const { email } = req.body;
  
    if (!email) {
      logger.error('Email not provided', { 
        adminId: req.user._id,
        requestId: req.id 
      });
      throw new AppError('Email is required', 400);
    }
  
    // Check if the restaurant exists
    const restaurant = await AdminService.getRestaurantByEmail(email);
    if (!restaurant) {
      logger.error('Restaurant not found', { 
        adminId: req.user._id,
        email,
        requestId: req.id 
      });
      throw new AppError('Restaurant not found', 404);
    }
  
    logger.info('Approving restaurant', { 
      adminId: req.user._id,
      email,
      requestId: req.id
    });
  
    try {
      const updatedRestaurant = await AdminService.updateRestaurantStatus(restaurant._id, 'approved');
  
      res.status(200).json({
        status: 'success',
        message: 'Restaurant approved successfully',
        data: {
          email: updatedRestaurant.email,
          restaurantName: updatedRestaurant.restaurantName,
          adminCode: updatedRestaurant.adminCode
        }
      });
    } catch (error) {
      logger.error('Error approving restaurant', {
        error: error.message,
        adminId: req.user._id,
        email,
        requestId: req.id
      });
      throw error;
    }
  }),
  rejectRestaurant: catchAsync(async (req, res) => {
    const { email, reason } = req.body;

    if (!email) {
      logger.error('Email not provided', { 
        adminId: req.user._id,
        requestId: req.id 
      });
      throw new AppError('Email is required', 400);
    }

    if (!reason) {
      logger.error('Reason not provided', { 
        adminId: req.user._id,
        email,
        requestId: req.id 
      });
      throw new AppError('Reason is required for rejection', 400);
    }

    // Check if the restaurant exists
    const restaurant = await AdminService.getRestaurantByEmail(email);
    if (!restaurant) {
      logger.error('Restaurant not found', { 
        adminId: req.user._id,
        email,
        requestId: req.id 
      });
      throw new AppError('Restaurant not found', 404);
    }

    logger.info('Rejecting restaurant', { 
      adminId: req.user._id,
      email,
      reason,
      requestId: req.id
    });

    try {
      const updatedRestaurant = await AdminService.updateRestaurantStatus(restaurant._id, 'rejected', reason);

      await emailService.sendEmail({
        to: updatedRestaurant.email,
        subject: 'Update on Your TOT Restaurant Application',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Application Status Update</h2>
            <p>Thank you for your interest in joining TOT.</p>
            <p>After review, we are unable to approve your application at this time.</p>
            ${reason ? `<p>Reason for rejection: ${reason}</p>` : ''}
            <p>You may submit a new application after 30 days.</p>
          </div>
        `
      });

      res.status(200).json({
        status: 'success',
        message: 'Restaurant rejected successfully'
      });
    } catch (error) {
      logger.error('Error rejecting restaurant', {
        error: error.message,
        adminId: req.user._id,
        email,
        reason,
        requestId: req.id
      });
      throw new AppError('Failed to reject restaurant', 500);
    }
  }),

  bulkApproveRestaurants: catchAsync(async (req, res) => {
    const { ids } = req.body;
  
    // Validate IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0 || ids.some(id => id === null || id === undefined)) {
      logger.error('Invalid restaurant IDs for bulk approval', { 
        adminId: req.user._id,
        restaurantIds: ids,
        requestId: req.id 
      });
      throw new AppError('Invalid restaurant IDs', 400);
    }
  
    // Validate each ID is a valid ObjectId
    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      logger.error('Some restaurant IDs are invalid', { 
        adminId: req.user._id,
        invalidIds,
        requestId: req.id 
      });
      throw new AppError('Some restaurant IDs are invalid', 400);
    }
  
    logger.info('Bulk approving restaurants', { 
      adminId: req.user._id,
      restaurantIds: ids,
      requestId: req.id
    });
  
    try {
      const count = await AdminService.bulkUpdateRestaurantStatus(ids, 'approved');
  
      res.status(200).json({
        status: 'success',
        message: `Successfully approved ${count} restaurants`
      });
    } catch (error) {
      logger.error('Error bulk approving restaurants', {
        error: error.message,
        adminId: req.user._id,
        restaurantIds: ids,
        requestId: req.id
      });
      throw new AppError('Failed to bulk approve restaurants', 500);
    }
  }),

  bulkRejectRestaurants: catchAsync(async (req, res) => {
    const { ids } = req.body;
    const { reason } = req.body;

    // Validate IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      logger.error('Invalid restaurant IDs for bulk rejection', { 
        adminId: req.user._id,
        restaurantIds: ids,
        requestId: req.id 
      });
      throw new AppError('Invalid restaurant IDs', 400);
    }

    // Validate each ID
    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      logger.error('Some restaurant IDs are invalid', { 
        adminId: req.user._id,
        invalidIds,
        requestId: req.id 
      });
      throw new AppError('Some restaurant IDs are invalid', 400);
    }

    logger.info('Bulk rejecting restaurants', { 
      adminId: req.user._id,
      restaurantIds: ids,
      reason,
      requestId: req.id
    });

    try {
      const count = await AdminService.bulkUpdateRestaurantStatus(ids, 'rejected', reason);
      res.status(200).json({
        status: 'success',
        message: `Successfully rejected ${count} restaurants`
      });
    } catch (error) {
      logger.error('Error bulk rejecting restaurants', {
        error: error.message,
        adminId: req.user._id,
        restaurantIds: ids,
        reason,
        requestId: req.id
      });
      throw new AppError('Failed to bulk reject restaurants', 500);
    }
  })
};

export default adminController;
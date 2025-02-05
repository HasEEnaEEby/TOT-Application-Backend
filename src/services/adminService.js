// src/services/adminService.js
import crypto from 'crypto';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import emailService from './emailservices.js';

export class AdminService {
  // Generate unique admin code
  static async generateUniqueAdminCode() {
    let isUnique = false;
    let adminCode;
    let attempts = 0;
    const maxAttempts = 10;
  
    while (!isUnique && attempts < maxAttempts) {
      try {
        adminCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        // Check if code is already in use
        const existingUser = await User.findOne({ adminCode }).select('+adminCode');
        if (!existingUser) {
          isUnique = true;
        }
        attempts++;
      } catch (error) {
        logger.error('Error generating admin code:', error);
        throw new AppError('Failed to generate admin code', 500);
      }
    }
  
    if (!isUnique) {
      throw new AppError('Failed to generate unique admin code', 500);
    }
  
    return adminCode;
  }

  static async getPendingRestaurants() {
    try {
      const restaurants = await User.find({
        role: 'restaurant',
        status: 'pending'
      })
      .select('-password -resetPasswordToken -resetPasswordExpires -verificationToken -verificationExpires')
      .sort({ createdAt: -1 });

      return restaurants.map(restaurant => ({
        id: restaurant._id,
        email: restaurant.email,
        username: restaurant.username,
        restaurantName: restaurant.restaurantName || `${restaurant.username}'s Restaurant`,
        location: restaurant.location || 'Not Set',
        contactNumber: restaurant.contactNumber || 'Not Set',
        status: restaurant.status,
        createdAt: restaurant.createdAt,
        isEmailVerified: restaurant.isEmailVerified
      }));
    } catch (error) {
      logger.error('Error fetching pending restaurants:', error);
      throw new AppError('Failed to fetch pending restaurants', 500);
    }
  }

  static async updateRestaurantStatus(restaurantId, newStatus, reason = null) {
    try {
      let adminCode = null;
      if (newStatus === 'approved') {
        adminCode = await this.generateUniqueAdminCode();
        logger.info('Generated admin code for restaurant', { 
          restaurantId, 
          adminCode 
        });
      }
  
      // Build the update object
      const updateQuery = {
        $set: {
          status: newStatus,
          isEmailVerified: true,
          lastStatusUpdate: new Date(),
          statusUpdateReason: reason || 'Admin action'
        }
      };
  
      if (adminCode) {
        updateQuery.$set.adminCode = adminCode;
      }
  
      // Update the restaurant
      const restaurant = await User.findOneAndUpdate(
        { _id: restaurantId, role: 'restaurant' },
        updateQuery,
        { 
          new: true,
          runValidators: true,
          select: '+adminCode'  // Explicitly include adminCode in response
        }
      );
  
      if (!restaurant) {
        throw new AppError('Restaurant not found', 404);
      }
  
      // Double-check if admin code was saved
      if (newStatus === 'approved') {
        const verifyRestaurant = await User.findById(restaurantId).select('+adminCode');
        if (!verifyRestaurant.adminCode || verifyRestaurant.adminCode !== adminCode) {
          logger.error('Admin code not saved correctly', {
            restaurantId,
            expectedCode: adminCode,
            savedCode: verifyRestaurant.adminCode
          });
          throw new AppError('Failed to save admin code', 500);
        }
      }
  
      // Send email notification
      if (newStatus === 'approved') {
        await emailService.sendEmail({
          to: restaurant.email,
          subject: 'TOT Restaurant Application Approved! 🎉',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #22c55e;">Congratulations!</h2>
              <p>Your restaurant "${restaurant.restaurantName}" has been approved on TOT!</p>
              <p>Your unique admin code for logging in is: <strong>${adminCode}</strong></p>
              <p style="color: #ef4444;">Important: Please save this admin code securely. You will need it to log in.</p>
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
      } else if (newStatus === 'rejected') {
        await emailService.sendEmail({
          to: restaurant.email,
          subject: 'Update on Your TOT Restaurant Application',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ef4444;">Application Status Update</h2>
              <p>Thank you for your interest in joining TOT.</p>
              <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
              ${reason ? `<p>Reason for rejection: ${reason}</p>` : ''}
              <p>You may submit a new application after 30 days with updated information.</p>
            </div>
          `
        });
      }
  
      return restaurant;
    } catch (error) {
      logger.error('Error updating restaurant status:', {
        error: error.message,
        restaurantId,
        newStatus,
        reason
      });
      throw error;
    }
  }


static async getRestaurantByEmail(email) {
  try {
    const restaurant = await User.findOne({
      email,
      role: 'restaurant'
    });
    return restaurant;
  } catch (error) {
    logger.error('Error finding restaurant by email:', error);
    throw new AppError('Failed to find restaurant', 500);
  }
}

static async bulkUpdateRestaurantStatus(restaurantIds, newStatus, reason = null) {
  try {
    const restaurants = await User.find({
      _id: { $in: restaurantIds },
      role: 'restaurant',
      status: 'pending'
    }).select('email restaurantName username');

    // For approved status, generate unique admin codes for each restaurant
    const updates = await Promise.all(restaurants.map(async (restaurant) => {
      const adminCode = newStatus === 'approved' ? 
        await this.generateUniqueAdminCode() : null;

      await User.updateOne(
        { _id: restaurant._id },
        { 
          status: newStatus,
          ...(adminCode && { adminCode }),
          $set: {
            lastStatusUpdate: new Date(),
            statusUpdateReason: reason || 'Admin bulk action'
          }
        }
      );

      return { restaurant, adminCode };
    }));

    // Send emails to all affected restaurants
    const emailPromises = updates.map(({ restaurant, adminCode }) => {
      const emailContent = newStatus === 'approved'
        ? {
            subject: 'TOT Restaurant Application Approved! 🎉',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #22c55e;">Congratulations!</h2>
                <p>Your restaurant "${restaurant.restaurantName || restaurant.username + '\'s Restaurant'}" has been approved on TOT!</p>
                <p>Your unique admin code for logging in is: <strong>${adminCode}</strong></p>
                <p>Please save this code as you will need it for future logins.</p>
                <div style="margin: 20px 0;">
                  <a href="${process.env.FRONTEND_URL}/login" 
                     style="background-color: #22c55e; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 5px; display: inline-block;">
                    Login to Dashboard
                  </a>
                </div>
              </div>
            `
          }
        : {
            subject: 'Update on Your TOT Restaurant Application',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ef4444;">Application Status Update</h2>
                <p>Thank you for your interest in joining TOT.</p>
                <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
                ${reason ? `<p>Reason for rejection: ${reason}</p>` : ''}
                <p>You may submit a new application after 30 days with updated information.</p>
              </div>
            `
          };

      return emailService.sendEmail({
        to: restaurant.email,
        ...emailContent
      });
    });

    // Send all emails in parallel
    await Promise.all(emailPromises);

    return updates.length;
  } catch (error) {
    logger.error('Error bulk updating restaurant status:', {
      error: error.message,
      restaurantIds,
      newStatus,
      reason
    });
    throw new AppError('Failed to update restaurants', 500);
  }
}
  // Verify admin code
  static async verifyAdminCode(restaurantId, adminCode) {
    try {
      const restaurant = await User.findOne({
        _id: restaurantId,
        role: 'restaurant',
        status: 'approved'
      });

      if (!restaurant) {
        throw new AppError('Restaurant not found or not approved', 404);
      }

      if (restaurant.adminCode !== adminCode) {
        throw new AppError('Invalid admin code', 401);
      }

      return true;
    } catch (error) {
      logger.error('Error verifying admin code:', {
        error: error.message,
        restaurantId
      });
      throw error;
    }
  }
}

export default AdminService;
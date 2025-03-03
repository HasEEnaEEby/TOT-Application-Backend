import { cacheService } from '../config/cacheService.js';
import RestaurantManagement from '../models/RestaurantManagement.js';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import Order from '../models/Order.js'; 
import mongoose from 'mongoose';


export const managementController = {

  updateOnlineStatus: catchAsync(async (req, res) => {
    const restaurantId = req.user._id;
    const { isOnline } = req.body;

    // Validate input
    if (typeof isOnline !== 'boolean') {
      throw new AppError('Invalid online status', 400);
    }

    logger.info('Updating restaurant online status', {
      restaurantId,
      isOnline,
      requestId: req.id
    });

    // Update cache service
    await cacheService.setRestaurantStatus(restaurantId, isOnline);

    // Update restaurant management record
    const updatedManagement = await RestaurantManagement.findOneAndUpdate(
      { restaurant: restaurantId },
      {
        $push: {
          activityLog: {
            action: isOnline ? 'WENT_ONLINE' : 'WENT_OFFLINE',
            timestamp: new Date(),
            details: {
              ip: req.ip,
              userAgent: req.headers['user-agent']
            }
          }
        },
        'status.isOnline': isOnline,
        'status.lastActive': new Date()
      },
      { new: true }
    );

    if (!updatedManagement) {
      throw new AppError('Restaurant management record not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { 
        isOnline,
        lastActive: updatedManagement.status.lastActive 
      }
    });
  }),

  getStatus: catchAsync(async (req, res) => {
    const restaurantId = req.user._id;
    const isOnline = await cacheService.getRestaurantStatus(restaurantId);

    const management = await RestaurantManagement.findOne({ restaurant: restaurantId })
      .select('status');

    res.json({
      status: 'success',
      data: { 
        isOnline,
        lastActive: management?.status?.lastActive || null
      }
    });
  }),

  getStatistics: catchAsync(async (req, res) => {
    const restaurantId = req.user._id;
    
    const management = await RestaurantManagement.findOne({ restaurant: restaurantId })
      .populate('performance.popularItems.item');

    if (!management) {
      throw new AppError('Restaurant management data not found', 404);
    }

    const isOnline = await cacheService.getRestaurantStatus(restaurantId);

    // Aggregate additional statistics
    const orderStats = await Order.aggregate([
      { $match: { restaurant: new mongoose.Types.ObjectId(restaurantId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' }
        }
      }
    ]);

    res.json({
      status: 'success',
      data: {
        isOnline,
        subscription: management.subscription,
        metrics: management.metrics,
        rating: management.rating,
        orderStats,
        popularItems: management.performance?.popularItems || []
      }
    });
  }),

  getActivityLog: catchAsync(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const management = await RestaurantManagement.findOne({ 
      restaurant: req.user._id 
    })
    .select('activityLog')
    .slice('activityLog', [skip, limit]);

    if (!management) {
      throw new AppError('Restaurant management data not found', 404);
    }

    const totalLogs = await RestaurantManagement.findOne({ restaurant: req.user._id })
      .select('activityLog')
      .then(doc => doc.activityLog.length);

    res.json({
      status: 'success',
      data: {
        activityLog: management.activityLog,
        pagination: {
          currentPage: page,
          totalLogs,
          pageSize: limit
        }
      }
    });
  }),

  // Performance Metrics
  getPerformanceMetrics: catchAsync(async (req, res) => {
    const management = await RestaurantManagement.findOne({ 
      restaurant: req.user._id 
    }).select('performance');

    if (!management) {
      throw new AppError('Restaurant management data not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        performance: management.performance
      }
    });
  }),

  // Revenue
  getRevenue: catchAsync(async (req, res) => {
    const management = await RestaurantManagement.findOne({ 
      restaurant: req.user._id 
    }).select('revenue');

    if (!management) {
      throw new AppError('Restaurant management data not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        revenue: management.revenue
      }
    });
  }),

  // Order Analytics
  getOrderAnalytics: catchAsync(async (req, res) => {
    const management = await RestaurantManagement.findOne({ 
      restaurant: req.user._id 
    }).select('orders');

    if (!management) {
      throw new AppError('Restaurant management data not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        orders: management.orders
      }
    });
  }),

  // Popular Items
  getPopularItems: catchAsync(async (req, res) => {
    const management = await RestaurantManagement.findOne({ 
      restaurant: req.user._id 
    }).select('performance.popularItems')
    .populate('performance.popularItems.item');

    if (!management) {
      throw new AppError('Restaurant management data not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        popularItems: management.performance.popularItems
      }
    });
  }),

  // Payment History
  getPaymentHistory: catchAsync(async (req, res) => {
    const management = await RestaurantManagement.findOne({ 
      restaurant: req.user._id 
    }).select('payments');

    if (!management) {
      throw new AppError('Restaurant management data not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        payments: management.payments
      }
    });
  }),

  // Subscription Status
  getSubscriptionStatus: catchAsync(async (req, res) => {
    const management = await RestaurantManagement.findOne({ 
      restaurant: req.user._id 
    }).select('subscription');

    if (!management) {
      throw new AppError('Restaurant management data not found', 404);
    }

    res.json({
      status: 'success',
      data: {
        subscription: management.subscription
      }
    });
  }), 
  
// Operating Hours Management
getOperatingHours: catchAsync(async (req, res) => {
    const management = await RestaurantManagement.findOne({ 
      restaurant: req.user._id 
    }).select('operatingHours');
  
    if (!management) {
      throw new AppError('Restaurant management data not found', 404);
    }
  
    res.json({
      status: 'success',
      data: { operatingHours: management.operatingHours }
    });
  }),
  
  updateOperatingHours: catchAsync(async (req, res) => {
    const management = await RestaurantManagement.findOneAndUpdate(
      { restaurant: req.user._id },
      { operatingHours: req.body.operatingHours },
      { new: true, runValidators: true }
    ).select('operatingHours');
  
    if (!management) {
      throw new AppError('Restaurant management data not found', 404);
    }
  
    // Log the update
    await management.logActivity('OPERATING_HOURS_UPDATED', {
      timestamp: new Date()
    });
  
    res.json({
      status: 'success',
      data: { operatingHours: management.operatingHours }
    });
  }),
  
  // Order Management
  getCurrentOrders: catchAsync(async (req, res) => {
    const management = await RestaurantManagement.findOne({ 
      restaurant: req.user._id 
    }).select('orders')
    .populate('orders.history');
  
    const currentOrders = management.orders.history.filter(order => 
      ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
    );
  
    res.json({
      status: 'success',
      results: currentOrders.length,
      data: { orders: currentOrders }
    });
  }),
  
  updateOrderStatus: catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
  
    const allowedStatuses = ['confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      throw new AppError('Invalid order status', 400);
    }
  
    const management = await RestaurantManagement.findOne({ 
      restaurant: req.user._id,
      'orders.history': orderId 
    });
  
    if (!management) {
      throw new AppError('Order not found', 404);
    }
  
    // Update order status
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );
  
    // Log the status update
    await management.logActivity('ORDER_STATUS_UPDATED', {
      orderId,
      newStatus: status
    });
  
    res.json({
      status: 'success',
      data: { order }
    });
  }),

  adminSubscribeRestaurant: catchAsync(async (req, res) => {
    const { id } = req.params; // Restaurant ID from request params
    const { amount } = req.body; // Subscription amount

    if (!id || !amount) {
      throw new AppError('Restaurant ID and subscription amount are required', 400);
    }

    // ✅ Ensure the restaurant exists
    const restaurant = await User.findOne({ _id: id, role: "restaurant" });
    if (!restaurant) {
        return next(new AppError("Restaurant not found", 404));
    }

    // ✅ Check if restaurant management data exists
    let restaurantManagement = await RestaurantManagement.findOne({ restaurant: id });

    if (!restaurantManagement) {
      // ✅ Create a new record if it does not exist
      restaurantManagement = new RestaurantManagement({ restaurant: id });
    }

    // ✅ Allow both admin and restaurant to subscribe
    if (req.user.role === "admin" || req.user.role === "restaurant") {
        restaurantManagement.subscription = {
            amount,
            status: "active",
            startDate: new Date(),
            expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 1)) // +1 month
        };

        // ✅ Log activity
        restaurantManagement.activityLog.push({
            action: "SUBSCRIBED_TO_PRO",
            timestamp: new Date(),
            details: {
                adminId: req.user._id,
                amount
            }
        });

        await restaurantManagement.save();

        res.status(200).json({
            status: "success",
            message: "Subscription updated successfully!",
            subscription: restaurantManagement.subscription
        });
    } else {
        throw new AppError("You do not have permission to perform this action", 403);
    }
  }),  

  getAdminRestaurantInsights: catchAsync(async (req, res) => {
    const insights = await RestaurantManagement.aggregate([
      {
        $group: {
          _id: null,
          totalRestaurants: { $sum: 1 },
          totalRevenue: { $sum: '$subscription.amount' },
          activeSubscriptions: { 
            $sum: { 
              $cond: [{ $eq: ['$subscription.status', 'active'] }, 1, 0] 
            } 
          },
          averageOrderCount: { $avg: '$metrics.orderCount' },
          averageRating: { $avg: '$rating.average' }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: insights[0] || {}
    });
  }),

  // Admin Revenue Overview
  getAdminRevenueOverview: catchAsync(async (req, res) => {
    const revenueOverview = await RestaurantManagement.aggregate([
      {
        $group: {
          _id: { 
            month: { $month: '$subscription.startDate' },
            year: { $year: '$subscription.startDate' }
          },
          totalRevenue: { $sum: '$subscription.amount' },
          subscriptionCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: revenueOverview
    });
  })

};

export default managementController;
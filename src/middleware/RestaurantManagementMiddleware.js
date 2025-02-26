// src/middleware/RestaurantManagementMiddleware.js
import { cacheService as restaurantStatusService } from '../config/cacheService.js';
import { ROLES } from '../constants/roles.js';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export const restaurantManagementMiddleware = {
  // Initialize restaurant management
  initializeManagement: catchAsync(async (req, res, next) => {
    logger.info('Initializing restaurant management', {
      userId: req.user._id,
      role: req.user.role
    });

    // Verify restaurant exists and has correct role
    const restaurant = await User.findOne({ 
      _id: req.user._id, 
      role: ROLES.RESTAURANT 
    });
    
    if (!restaurant) {
      logger.error('Restaurant profile not found', { 
        userId: req.user._id 
      });
      throw new AppError('Restaurant profile not found', 404);
    }

    // Check restaurant status
    if (restaurant.status !== 'approved') {
      logger.warn('Restaurant not approved', { 
        userId: req.user._id,
        status: restaurant.status 
      });
      throw new AppError('Restaurant account is not approved', 403);
    }

    // Track restaurant activity
    await restaurantStatusService.set(`restaurant:${restaurant._id}:status`, {
      online: true,
      lastActive: new Date(),
      restaurantId: restaurant._id
    }, 300); // 5 minute TTL

    req.restaurant = restaurant;
    next();
  }),

  // Track real-time activity
  trackActivity: catchAsync(async (req, res, next) => {
    if (req.restaurant) {
      await restaurantStatusService.set(`restaurant:${req.restaurant._id}:status`, {
        online: true,
        lastActive: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }, 300); // 5 minute TTL

      // Update last active timestamp in database
      await User.findByIdAndUpdate(req.restaurant._id, {
        lastLogin: new Date()
      });
    }
    next();
  }),

  // Track menu changes
  trackMenuChanges: catchAsync(async (req, res, next) => {
    if (req.restaurant) {
      const action = req.method === 'POST' ? 'Menu Item Added' :
                     req.method === 'PUT' ? 'Menu Item Updated' :
                     req.method === 'DELETE' ? 'Menu Item Removed' : 'Menu Modified';

      // Log the activity
      await User.findByIdAndUpdate(req.restaurant._id, {
        $push: {
          activityLog: {
            action,
            details: {
              itemId: req.params.id,
              changes: req.body,
              method: req.method,
              path: req.path
            },
            timestamp: new Date()
          }
        }
      });
    }
    next();
  }),

  // Verify order capacity
  checkOrderCapacity: catchAsync(async (req, res, next) => {
    const restaurant = req.restaurant;

    // Get active orders count from cache
    const activeOrders = await restaurantStatusService.get(
      `restaurant:${restaurant._id}:activeOrders`
    ) || 0;

    // Get pending orders from cache
    const pendingOrders = await restaurantStatusService.get(
      `restaurant:${restaurant._id}:pendingOrders`
    ) || 0;

    const totalCurrentOrders = activeOrders + pendingOrders;
    const maxOrders = 50; // Default max orders per hour

    if (totalCurrentOrders >= maxOrders) {
      throw new AppError('Restaurant has reached maximum order capacity', 429);
    }

    next();
  }),

  // Validate subscription features
  validateFeatureAccess: (feature) => {
    return catchAsync(async (req, res, next) => {
      const restaurant = req.restaurant;
      
      if (!restaurant.subscriptionPro) {
        throw new AppError(
          `This feature requires a Pro subscription`, 
          403
        );
      }

      next();
    });
  },

  // Log restaurant operations
  logOperation: catchAsync(async (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      logger.info('Restaurant Operation', {
        restaurantId: req.restaurant._id,
        operation: `${req.method} ${req.originalUrl}`,
        status: res.statusCode,
        duration,
        ip: req.ip
      });
    });

    next();
  }),

  // Enforce rate limits
  rateLimit: catchAsync(async (req, res, next) => {
    const key = `ratelimit:restaurant:${req.restaurant._id}`;
    const limit = 100; // requests per minute
    const current = await restaurantStatusService.increment(key, 60); // 60 second TTL

    if (current > limit) {
      throw new AppError('Rate limit exceeded', 429);
    }

    next();
  }),

  // Check operating hours
  checkOperatingHours: catchAsync(async (req, res, next) => {
    const restaurant = req.restaurant;
    const now = new Date();
    const day = now.toLocaleLowerCase();
    const time = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const operatingHours = await restaurantStatusService.get(
      `restaurant:${restaurant._id}:hours`
    );

    if (!operatingHours || operatingHours[day]?.isClosed) {
      throw new AppError('Restaurant is currently closed', 400);
    }

    const dayHours = operatingHours[day];
    if (time < dayHours?.open || time > dayHours?.close) {
      throw new AppError('Restaurant is outside operating hours', 400);
    }

    next();
  }),

  // Update metrics
  updateMetrics: catchAsync(async (req, res, next) => {
    const restaurant = req.restaurant;

    // Update last activity timestamp and increment metrics
    await User.findByIdAndUpdate(restaurant._id, {
      lastLogin: new Date(),
      $inc: { 'orderCount': 1 }
    });

    next();
  })
};

export default restaurantManagementMiddleware;
// src/routes/restaurantRoutes.js
import express from 'express';
import multer from 'multer';
import { defaultCors, fileUploadCors } from '../config/cors.js';
import { ROLES } from '../constants/roles.js';
import restaurantController from '../controllers/restaurantController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import restaurantManagementMiddleware from '../middleware/RestaurantManagementMiddleware.js';
import MenuItem from '../models/MenuItem.js';
import RestaurantManagement from '../models/RestaurantManagement.js';
import { Subscription } from '../models/subscription.js';
import Table from '../models/Table.js';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import { validateMenuItem } from '../validators/restaurantValidator.js';

const router = express.Router();

// File Upload Configuration
const uploadConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    try {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const allowedExtensions = ['jpeg', 'jpg', 'png', 'webp'];
      
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new AppError('Invalid file type. Only images are allowed.', 400));
      }

      const extension = file.originalname.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(extension)) {
        return cb(new AppError(
          `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`, 
          400
        ));
      }

      logger.info('File validation passed', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      cb(null, true);
    } catch (error) {
      logger.error('File validation failed:', error);
      cb(error);
    }
  }
};

const upload = multer(uploadConfig);

// File Upload Middleware
const handleFileUpload = catchAsync(async (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size exceeds 5MB limit', 400));
      }
      return next(new AppError(`File upload error: ${err.message}`, 400));
    }
    
    if (err) {
      return next(new AppError(err.message, 400));
    }

    if (req.file) {
      logger.info('File upload successful', {
        filename: req.file.originalname,
        size: req.file.size
      });
    }

    next();
  });
});

// Restaurant middleware stack
const restaurantMiddlewares = [
  defaultCors,
  protect,
  restrictTo('restaurant'),
  restaurantManagementMiddleware.initializeManagement,
  restaurantManagementMiddleware.trackActivity
];

// Restaurant Profile API
// --------------------------------

// Get and update profile
router.route('/profile')
  .get(restaurantMiddlewares, restaurantController.getProfile)
  .put([   // Keep this for backward compatibility
    ...restaurantMiddlewares, 
    fileUploadCors, 
    handleFileUpload
  ], restaurantController.updateProfile)
  .patch([  // Add this to match your frontend
    ...restaurantMiddlewares, 
    fileUploadCors, 
    handleFileUpload
  ], restaurantController.updateProfile);

// Statistics endpoint
router.get(
  '/statistics', 
  restaurantMiddlewares, 
  catchAsync(async (req, res) => {
    const restaurantId = req.user._id;
    
    // Get management data
    const managementData = await RestaurantManagement.findOne({ restaurant: restaurantId });
    
    if (!managementData) {
      // Return default data if no management document exists
      return res.status(200).json({
        status: 'success',
        data: {
          todayOrders: 0,
          activeTables: 0,
          totalTables: 10,
          revenue: {
            today: 0,
            weekly: 0,
            monthly: 0
          }
        }
      });
    }
    
    // Calculate today's data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Return actual statistics
    res.status(200).json({
      status: 'success',
      data: {
        todayOrders: managementData.metrics?.todayOrders || 0,
        activeTables: managementData.metrics?.activeTables || 0,
        totalTables: managementData.metrics?.totalTables || 10,
        revenue: {
          today: managementData.metrics?.revenue?.today || 0,
          weekly: managementData.metrics?.revenue?.weekly || 0,
          monthly: managementData.metrics?.revenue?.monthly || 0
        }
      }
    });
  })
);

// Image Management
// --------------------------------

// Upload image (profile, cover, menu item)
router.post(
  '/image', 
  [
    ...restaurantMiddlewares,
    fileUploadCors, 
    handleFileUpload
  ], 
  restaurantController.uploadImage
);

// Delete image
router.delete(
  '/image/:type', 
  restaurantMiddlewares, 
  catchAsync(async (req, res, next) => {
    try {
      if (typeof restaurantController.deleteImage !== 'function') {
        return next(new AppError('Invalid delete image handler', 500));
      }
      
      return restaurantController.deleteImage(req, res);
    } catch (error) {
      next(error);
    }
  })
);

// Menu Management
// --------------------------------

// Get all menu items / Create new menu item
router.route('/menu')
  .get(restaurantMiddlewares, restaurantController.getMenuItems)
  .post([
    ...restaurantMiddlewares,
    fileUploadCors,
    handleFileUpload,
    validateMenuItem,
    restaurantManagementMiddleware.trackMenuChanges
  ], restaurantController.createMenuItem);

// Get/Update/Delete single menu item
router.route('/menu/:id')
  .get(restaurantMiddlewares, restaurantController.getMenuItem)
  .put([
    ...restaurantMiddlewares,
    fileUploadCors,
    handleFileUpload,
    validateMenuItem,
    restaurantManagementMiddleware.trackMenuChanges
  ], restaurantController.updateMenuItem)
  .delete([
    ...restaurantMiddlewares,
    restaurantManagementMiddleware.trackMenuChanges
  ], restaurantController.deleteMenuItem);

// Toggle menu item availability
router.patch(
  '/menu/:id/toggle-availability',
  [
    ...restaurantMiddlewares,
    restaurantManagementMiddleware.trackMenuChanges
  ],
  restaurantController.toggleMenuItemAvailability
);

// Get menu items by category
router.get(
  '/menu/category/:category', 
  restaurantMiddlewares, 
  restaurantController.getMenuItemsByCategory
);

// Operating Hours
// --------------------------------

router.route('/operating-hours')
  .get(restaurantMiddlewares, restaurantController.getOperatingHours)
  .put(restaurantMiddlewares, restaurantController.updateOperatingHours);

// Order Management
// --------------------------------

// Get current active orders
router.get(
  '/orders/current', 
  restaurantMiddlewares, 
  restaurantController.getCurrentOrders
);

// Update order status
router.patch(
  '/orders/:orderId/status', 
  restaurantMiddlewares, 
  restaurantController.updateOrderStatus
);

// Subscription Management
// --------------------------------

// Subscribe to pro plan
router.patch(
  '/subscribe-to-pro',
  [
    ...restaurantMiddlewares,
    catchAsync(async (req, res) => {
      const restaurantId = req.user._id;
      logger.info(`Restaurant ${restaurantId} requesting pro subscription`);

      // 1. Update User model with subscription details
      const restaurant = await User.findByIdAndUpdate(
        restaurantId,
        {
          subscriptionPro: true,
          subscriptionAmount: 16000,
          subscriptionStartDate: new Date(),
          lastLogin: new Date()
        },
        { new: true }
      ).select('-password -adminCode');

      if (!restaurant) {
        throw new AppError('Restaurant not found', 404);
      }

      // 2. Get or create RestaurantManagement record
      let management = await RestaurantManagement.findOne({ restaurant: restaurantId });
      if (!management) {
        management = new RestaurantManagement({ restaurant: restaurantId });
      }

      // 3. Update RestaurantManagement subscription
      management.addSubscription(16000, 'pro', 30);
      
      // 4. Enable pro features
      management.features = {
        menuCustomization: true,
        analyticsAccess: true,
        promotionalTools: true
      };

      await management.save();

      // 5. Create a subscription record
      const subscription = await Subscription.create({
        restaurantId: restaurantId,
        planType: 'premium',
        startDate: new Date(),
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        monthlyFee: 16000,
        paymentStatus: 'paid'
      });

      logger.info(`Restaurant ${restaurantId} successfully subscribed to pro plan`);

      res.status(200).json({
        status: 'success',
        message: 'Successfully subscribed to pro plan',
        data: {
          restaurant,
          subscription: management.subscription,
          subscriptionDetails: subscription
        }
      });
    })
  ]
);

// Get public restaurant data for customer view
// --------------------------------

router.get(
  '/',
  defaultCors,
  catchAsync(async (req, res) => {
    logger.info('Fetching all restaurants for customer dashboard', {
      requestId: req.id
    });

    // Get only approved restaurants
    const restaurants = await User.find({ role: ROLES.RESTAURANT, status: 'approved' })
      .select('restaurantName location contactNumber quote createdAt updatedAt image')
      .lean();

    if (!restaurants.length) {
      throw new AppError('No restaurants available at the moment', 404);
    }

    // Fetch restaurant ratings from RestaurantManagement model
    const enrichedRestaurants = await Promise.all(
      restaurants.map(async (restaurant) => {
        const managementData = await RestaurantManagement.findOne({ restaurant: restaurant._id })
          .select('rating')
          .lean();

        return {
          _id: restaurant._id,
          restaurantName: restaurant.restaurantName,
          location: restaurant.location,
          contactNumber: restaurant.contactNumber,
          quote: restaurant.quote,
          rating: managementData?.rating?.average || 0, // Default to 0 if no rating
          createdAt: restaurant.createdAt,
          image: restaurant.image,
          updatedAt: restaurant.updatedAt,
        };
      })
    );

    res.status(200).json({
      status: 'success',
      results: enrichedRestaurants.length,
      data: enrichedRestaurants
    });
  })
);

// Admin-only routes
// --------------------------------

router.route('/admin/restaurants')
  .get(
    defaultCors,
    protect,
    restrictTo('admin'),
    catchAsync(async (req, res) => {
      const restaurants = await User.find({ role: ROLES.RESTAURANT })
        .select('restaurantName status lastLogin location contactNumber')
        .lean();

      const enrichedRestaurants = await Promise.all(restaurants.map(async (restaurant) => {
        const managementData = await RestaurantManagement.findOne({ restaurant: restaurant._id })
          .select('metrics rating subscription');

        return {
          _id: restaurant._id,
          restaurantName: restaurant.restaurantName,
          status: restaurant.status,
          revenue: managementData?.subscription?.amount || 0,
          orders: managementData?.metrics?.orderCount || 0,
          rating: managementData?.rating?.average || 0,
          location: restaurant.location,
          contactNumber: restaurant.contactNumber,
          lastPayment: managementData?.subscription?.startDate ? 
            new Date(managementData.subscription.startDate).toLocaleDateString() : '-',
          subscriptionStatus: managementData?.subscription?.status || 'inactive'
        };
      }));

      res.status(200).json({
        status: 'success',
        data: enrichedRestaurants
      });
    })
  );

router.route('/admin/restaurants/:id')
  .delete(
    defaultCors,
    protect,
    restrictTo('admin'),
    catchAsync(async (req, res, next) => {
      const restaurant = await User.findOne({
        _id: req.params.id,
        role: ROLES.RESTAURANT
      });

      if (!restaurant) {
        return next(new AppError('Restaurant not found', 404));
      }

      // Delete associated data
      await Promise.all([
        RestaurantManagement.deleteMany({ restaurant: req.params.id }),
        // Add other cleanup operations here
      ]);

      await User.findByIdAndDelete(req.params.id);

      res.status(200).json({
        status: 'success',
        message: 'Restaurant deleted successfully'
      });
    })
  );


  router.get(
    '/:id/details',
    defaultCors,
    catchAsync(async (req, res) => {
      const restaurant = await User.findOne({
        _id: req.params.id,
        role: ROLES.RESTAURANT,
        status: 'approved'
      }).select('restaurantName location contactNumber quote image');
  
      if (!restaurant) {
        throw new AppError('Restaurant not found', 404);
      }
  
      const managementData = await RestaurantManagement.findOne({ restaurant: req.params.id })
        .select('rating')
        .lean();
  
      const restaurantData = {
        _id: restaurant._id,
        restaurantName: restaurant.restaurantName,
        location: restaurant.location,
        contactNumber: restaurant.contactNumber,
        quote: restaurant.quote,
        image: restaurant.image,
        rating: managementData?.rating?.average || 0
      };
  
      res.status(200).json({
        status: 'success',
        data: restaurantData
      });
    })
  );
  
  // Get restaurant menu
  router.get(
    '/:id/menu',
    defaultCors,
    catchAsync(async (req, res) => {
      const restaurantId = req.params.id;
      
      // Changed restaurantId to restaurant in query to match schema
      const menuItems = await MenuItem.find({ restaurant: restaurantId })
        .select('name description price category image isAvailable preparationTime spicyLevel isVegetarian')
        .lean();
  
      logger.info(`Found ${menuItems.length} menu items for restaurant ${restaurantId}`);
  
      res.status(200).json({
        status: 'success',
        data: menuItems
      });
    })
  );
  
  // Get restaurant tables
  router.get(
    '/:id/tables',
    defaultCors,
    catchAsync(async (req, res) => {
      const restaurantId = req.params.id;
      
      // Changed restaurantId to restaurant in query to match schema
      const tables = await Table.find({ restaurant: restaurantId })
        .select('number capacity status position')
        .lean();
  
      logger.info(`Found ${tables.length} tables for restaurant ${restaurantId}`);
  
      res.status(200).json({
        status: 'success',
        data: tables
      });
    })
  );

// Global Error Handler
// --------------------------------

router.use((err, req, res, next) => {
  // Log the error
  logger.error('Router Error:', {
    error: err.message,
    name: err.name,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?._id,
    userRole: req.user?.role
  });

  // Prepare error response
  const errorResponse = {
    status: 'error',
    message: err.message || 'Internal server error',
    ...(err.errors && { errors: err.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Determine status code
  const statusCode = err.statusCode || 
                    (err.name === 'ValidationError' ? 400 : 
                     err.name === 'UnauthorizedError' ? 401 : 500);

  // Send error response
  res.status(statusCode).json(errorResponse);
});

export default router;
// src/routes/managementRoutes.js
import express from 'express';
import { defaultCors } from '../config/cors.js';
import { managementController } from '../controllers/managementController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { restaurantManagementMiddleware } from '../middleware/RestaurantManagementMiddleware.js';

const router = express.Router();

// Base Middleware Stack for restaurant routes
const restaurantMiddlewares = [
  defaultCors,
  protect,
  restrictTo('restaurant'),
  restaurantManagementMiddleware.initializeManagement,
  restaurantManagementMiddleware.trackActivity
];

// Base Middleware Stack for admin routes
const adminMiddlewares = [
  defaultCors,
  protect,
  restrictTo('admin')
];

// Ensure all methods exist before using them
const ensureControllerMethod = (method) => {
  if (typeof method !== 'function') {
    throw new Error(`Controller method is not a function: ${method}`);
  }
  return method;
};

// Restaurant-specific routes (for restaurant users)
router.use(restaurantMiddlewares);

// Status Management
router.route('/status')
  .post(ensureControllerMethod(managementController.updateOnlineStatus))
  .get(ensureControllerMethod(managementController.getStatus));

// Analytics & Statistics
router.get('/statistics', ensureControllerMethod(managementController.getStatistics));
router.get('/performance', ensureControllerMethod(managementController.getPerformanceMetrics));
router.get('/revenue', ensureControllerMethod(managementController.getRevenue));
router.get('/orders/analytics', ensureControllerMethod(managementController.getOrderAnalytics));
router.get('/popular-items', ensureControllerMethod(managementController.getPopularItems));

// Payment & Subscription
router.get('/payments/history', ensureControllerMethod(managementController.getPaymentHistory));
router.get('/subscription/status', ensureControllerMethod(managementController.getSubscriptionStatus));

// Activity Logs
router.get('/activity-log', ensureControllerMethod(managementController.getActivityLog));

// Operating Hours Routes
router.route('/operating-hours')
  .get(ensureControllerMethod(managementController.getOperatingHours))
  .put(ensureControllerMethod(managementController.updateOperatingHours));

// Order Management Routes
router.get('/orders/current', ensureControllerMethod(managementController.getCurrentOrders));
router.patch('/orders/:orderId/status', ensureControllerMethod(managementController.updateOrderStatus));


router.post(
  '/admin/restaurants/:id/subscribe', 
  [
    defaultCors,
    protect,
    restrictTo('admin')
  ], 
  ensureControllerMethod(managementController.adminSubscribeRestaurant)
);

// Placeholder methods for admin routes 
// Add these to your managementController.js if not already present
router.get(
  '/admin/restaurant-insights', 
  adminMiddlewares, 
  ensureControllerMethod(managementController.getAdminRestaurantInsights || (() => {
    throw new Error('Admin restaurant insights method not implemented');
  }))
);

router.get(
  '/admin/revenue-overview', 
  adminMiddlewares, 
  ensureControllerMethod(managementController.getAdminRevenueOverview || (() => {
    throw new Error('Admin revenue overview method not implemented');
  }))
);

export default router;
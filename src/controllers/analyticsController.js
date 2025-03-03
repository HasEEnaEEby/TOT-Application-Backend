// src/controllers/analyticsController.js

import analyticsService from '../services/restaurantAnalyticsService.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

/**
 * Get restaurant analytics
 * @route GET /api/analytics/restaurants/:restaurantId
 */
const getRestaurantAnalytics = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.params;
  const { period = 'month' } = req.query;
  
  // Validate period
  const validPeriods = ['day', 'week', 'month', 'year'];
  if (!validPeriods.includes(period)) {
    return next(new AppError(`Invalid period. Valid options are: ${validPeriods.join(', ')}`, 400));
  }
  
  console.log('User requesting analytics:', {
    userId: req.user.id,
    userRole: req.user.role,
    userRestaurant: req.user.restaurant,
    requestedRestaurant: restaurantId
  });
  
  // Modified authorization check - allow users to access their own restaurant's data
  // The issue is likely with string vs ObjectId comparison
  if (req.user.role !== 'admin') {
    // Convert both to strings for comparison to avoid ObjectId vs String issues
    const userRestaurantStr = String(req.user.restaurant || req.user.id);
    const requestedRestaurantStr = String(restaurantId);
    
    console.log('Comparing restaurant IDs:', {
      userRestaurantStr,
      requestedRestaurantStr,
      isEqual: userRestaurantStr === requestedRestaurantStr
    });
    
    // If the IDs don't match as strings, deny access
    if (userRestaurantStr !== requestedRestaurantStr) {
      return next(new AppError('You are not authorized to access this restaurant\'s data', 403));
    }
  }
  
  // Calculate analytics
  const analytics = await analyticsService.calculateRestaurantAnalytics(restaurantId, period);
  
  res.status(200).json({
    status: 'success',
    data: analytics
  });
});

/**
 * Get restaurant dashboard summary
 * @route GET /api/analytics/restaurants/:restaurantId/dashboard
 */
const getDashboardSummary = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.params;
  
  // Modified authorization check - allow users to access their own restaurant's data
  // The issue is likely with string vs ObjectId comparison
  if (req.user.role !== 'admin') {
    // Convert both to strings for comparison to avoid ObjectId vs String issues
    const userRestaurantStr = String(req.user.restaurant || req.user.id);
    const requestedRestaurantStr = String(restaurantId);
    
    // If the IDs don't match as strings, deny access
    if (userRestaurantStr !== requestedRestaurantStr) {
      return next(new AppError('You are not authorized to access this restaurant\'s data', 403));
    }
  }
  
  // Generate dashboard summary
  const dashboardSummary = await analyticsService.generateDashboardSummary(restaurantId);
  
  res.status(200).json({
    status: 'success',
    data: dashboardSummary
  });
});

export default {
  getRestaurantAnalytics,
  getDashboardSummary
};
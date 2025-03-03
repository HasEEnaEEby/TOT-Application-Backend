// src/routes/analyticsRoutes.js

import express from 'express';
import analyticsController from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';
import restrictTo from '../middleware/roleMiddleware.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Get restaurant analytics
// Allow restaurant owners and admins to access
router.get(
  '/restaurants/:restaurantId/analytics',
  restrictTo('restaurant', 'admin'),
  analyticsController.getRestaurantAnalytics
);

// Get restaurant dashboard summary
router.get(
  '/restaurants/:restaurantId/dashboard',
  restrictTo('restaurant', 'admin'),
  analyticsController.getDashboardSummary
);

router.get(
    '/restaurants/:restaurantId/analytics',
    restrictTo('restaurant', 'admin'),
    analyticsController.getRestaurantAnalytics
  );

export default router;
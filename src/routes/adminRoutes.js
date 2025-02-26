import express from 'express';
import { ROLES } from '../constants/roles.js';
import { adminController } from '../controllers/adminController.js';
import subscriptionController from '../controllers/subscriptionController.js';
import { protect } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';
import { bulkActionValidator } from '../validators/adminValidation.js';

const router = express.Router();

router.use((req, res, next) => {
  logger.info('Admin route accessed', {
    method: req.method,
    path: req.originalUrl,
    requestId: req.id
  });
  next();
});

router.use(protect);
router.use(roleMiddleware(['admin']));

// Restaurant Management Routes
router.get('/restaurants', async (req, res) => {
  const restaurants = await User.find({ role: ROLES.RESTAURANT })
    .select('restaurantName status subscriptionPro subscriptionAmount lastLogin location contactNumber orderCount averageRating')
    .lean();

  const enrichedRestaurants = restaurants.map(restaurant => ({
    _id: restaurant._id,
    restaurantName: restaurant.restaurantName,
    status: restaurant.status,
    revenue: restaurant.subscriptionPro ? restaurant.subscriptionAmount : 0,
    orders: restaurant.orderCount || 0,
    rating: restaurant.averageRating || 0,
    location: restaurant.location,
    contactNumber: restaurant.contactNumber,
    lastPayment: restaurant.subscriptionPro ? 
      new Date(restaurant.lastLogin).toLocaleDateString() : '-'
  }));

  res.status(200).json({
    status: 'success',
    data: enrichedRestaurants
  });
});

router.delete('/restaurants/:id', async (req, res) => {
  const restaurant = await User.findOneAndDelete({
    _id: req.params.id,
    role: ROLES.RESTAURANT
  });

  if (!restaurant) {
    return res.status(404).json({
      status: 'error',
      message: 'Restaurant not found'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Restaurant deleted successfully'
  });
});

// Restaurant Approval Routes
router.route('/restaurants/pending')
  .get(adminController.getPendingRestaurants);

router.route('/restaurants/approve')
  .post(adminController.approveRestaurant);

router.route('/restaurants/reject')
  .post(adminController.rejectRestaurant);

router.route('/restaurants/bulk-approve')
  .post(
    validateRequest(bulkActionValidator),
    adminController.bulkApproveRestaurants
  );

router.route('/restaurants/bulk-reject')
  .post(
    validateRequest(bulkActionValidator),
    adminController.bulkRejectRestaurants
  );

// Subscription Management Routes
router.route('/subscriptions')
  .get(subscriptionController.getAllSubscriptions)
  .post(subscriptionController.createSubscription);

router.route('/subscriptions/:id/renew')
  .post(subscriptionController.renewSubscription);

router.route('/subscriptions/:id/payment')
  .patch(subscriptionController.updatePaymentStatus);

export default router;
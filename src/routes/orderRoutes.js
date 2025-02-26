// routes/orderRoutes.js
import express from 'express';
import { orderController } from '../controllers/orderController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Customer routes
router.post('/', protect, restrictTo('customer'), orderController.createOrder);
router.get('/active', protect, restrictTo('customer'), orderController.getActiveOrder);
router.post('/:orderId/items', protect, restrictTo('customer'), orderController.addItemsToOrder);
router.patch('/:orderId/request-bill', protect, restrictTo('customer'), orderController.requestBill);
router.get('/history', protect, restrictTo('customer'), orderController.getOrderHistory);

// Restaurant routes
router.get('/restaurant', protect, restrictTo('restaurant'), orderController.getRestaurantOrders);
router.patch('/:orderId/status', protect, restrictTo('restaurant'), orderController.updateOrderStatus);

export default router;
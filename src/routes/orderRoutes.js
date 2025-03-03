import express from 'express';
import multer from 'multer';
import orderController from '../controllers/orderController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// ⚡ Configure Multer for File Uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// Customer routes
router.post('/', protect, restrictTo('customer'), orderController.createOrder);
router.get('/active', protect, restrictTo('customer'), orderController.getActiveOrder);
router.post('/:orderId/items', protect, restrictTo('customer'), orderController.addItemsToOrder);
router.patch('/:orderId/request-bill', protect, restrictTo('customer'), orderController.requestBill);
router.get('/history', protect, restrictTo('customer'), orderController.getOrderHistory);

// Restaurant routes
router.get('/restaurant', protect, restrictTo('restaurant'), orderController.getRestaurantOrders);
router.patch('/:orderId/status', protect, restrictTo('restaurant'), orderController.updateOrderStatus);
router.get('/restaurant/:restaurantId', protect, orderController.getOrdersByRestaurantId);

router.get('/:orderId/bill', protect, orderController.getBillDetails);
router.post('/:orderId/generate-bill', protect, restrictTo('restaurant'), orderController.generateBill);


// ✅ Apply Multer Middleware for QR Code Uploads
router.post(
  '/bills/:billId/upload-qr',
  protect,
  restrictTo('restaurant'),
  upload.single('qrCode'), // Multer processes the file
  orderController.uploadBillQrCode
);

// Debug route
router.get('/restaurant/debug', protect, (req, res) => {
  console.log('🔍 Debug route accessed');

  Order.find({
    restaurant: req.user._id,
    status: { $ne: 'completed' }
  }).then(orders => {
    console.log(`📊 Found ${orders.length} orders directly from DB`);
    res.json({
      status: 'success',
      results: orders.length,
      data: { orders }
    });
  }).catch(err => {
    console.error('❌ Debug route error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  });
});

export default router;

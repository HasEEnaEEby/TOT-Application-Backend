const express = require('express');
const { protect } = require('../middleware/authMiddleware'); 
const {
  createOrder,
  getAllOrders,
  updateOrderStatus,
} = require('../controller/OrderController');

const router = express.Router();

router.post('/', protect, createOrder);

router.get('/', protect, getAllOrders);

router.put('/update-status', protect, updateOrderStatus);

module.exports = router;

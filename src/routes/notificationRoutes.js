// routes/notificationRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Notification from '../models/Notification.js';
import { catchAsync } from '../utils/catchAsync.js';

const router = express.Router();

// Get user's notifications
router.get('/', protect, catchAsync(async (req, res) => {
  const { 
    limit = 10, 
    page = 1, 
    onlyUnread = false 
  } = req.query;

  const query = { 
    recipient: req.user._id,
    recipientModel: { $in: ['User', 'RestaurantManagement'] }
  };

  if (onlyUnread === 'true') {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .populate('sender', 'name email')
    .populate('relatedOrder');

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    data: { notifications }
  });
}));

// Mark notifications as read
router.patch('/read', protect, catchAsync(async (req, res) => {
  const { notificationIds } = req.body;
  const userId = req.user._id;

  const query = notificationIds && notificationIds.length > 0
    ? { _id: { $in: notificationIds }, recipient: userId }
    : { recipient: userId, isRead: false };

  const result = await Notification.updateMany(
    query, 
    { $set: { isRead: true } }
  );

  res.status(200).json({
    status: 'success',
    data: { 
      updatedCount: result.modifiedCount 
    }
  });
}));

export default router;
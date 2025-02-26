// models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'recipientModel',
      required: true
    },
    recipientModel: {
      type: String,
      enum: ['User', 'RestaurantManagement'],
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'senderModel',
      required: true
    },
    senderModel: {
      type: String,
      enum: ['User', 'RestaurantManagement'],
      required: true
    },
    type: {
      type: String,
      enum: [
        'order_placed', 
        'order_updated', 
        'order_status_change', 
        'bill_requested', 
        'table_assigned'
      ],
      required: true
    },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    content: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

// Create an index for fast querying
notificationSchema.index({ 
  recipient: 1, 
  recipientModel: 1, 
  isRead: 1, 
  createdAt: -1 
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
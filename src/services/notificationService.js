// services/notificationService.js
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';
import { getIO } from '../utils/socketIO.js';

class NotificationService {
  static async createOrderNotification(order, type) {
    try {
      logger.info('Creating order notifications', {
        orderId: order._id,
        restaurantId: order.restaurant,
        customerId: order.customer,
        tableId: order.table,
        orderType: type
      });

      // Notification for restaurant
      const restaurantNotification = await Notification.create({
        recipient: order.restaurant,
        recipientModel: 'RestaurantManagement',
        sender: order.customer,
        senderModel: 'User',
        type: 'order_placed',
        content: `New order placed at Table ${order.table}`,
        relatedOrder: order._id,
        metadata: {
          tableId: order.table,
          totalAmount: order.totalAmount,
          itemCount: order.items.length,
          items: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          }))
        }
      });

      // Notification for customer
      const customerNotification = await Notification.create({
        recipient: order.customer,
        recipientModel: 'User',
        sender: order.restaurant,
        senderModel: 'RestaurantManagement',
        type: 'order_placed',
        content: `Your order at Table ${order.table} has been received`,
        relatedOrder: order._id,
        metadata: {
          restaurantId: order.restaurant,
          totalAmount: order.totalAmount,
          tableNumber: order.table
        }
      });

      // Attempt to emit real-time notifications
      try {
        const io = getIO();
        
        if (!io) {
          logger.warn('Socket.IO not initialized, cannot emit notifications');
          return { restaurantNotification, customerNotification };
        }

        logger.info('Attempting to emit Socket.IO notifications', {
          restaurantRoom: order.restaurant.toString(),
          customerRoom: order.customer.toString()
        });

        // Emit to specific rooms
        io.to(order.restaurant.toString()).emit('newNotification', restaurantNotification);
        io.to(order.customer.toString()).emit('newNotification', customerNotification);

        // Optional: Broadcast to role-based rooms
        io.to('restaurant').emit('newRestaurantNotification', restaurantNotification);
        io.to('customer').emit('newCustomerNotification', customerNotification);

        logger.info('Socket.IO notifications emitted successfully');
      } catch (ioError) {
        logger.error('Failed to emit Socket.IO notifications', {
          error: ioError.message,
          orderId: order._id,
          errorStack: ioError.stack
        });
      }

      return { restaurantNotification, customerNotification };
    } catch (error) {
      logger.error('Failed to create order notifications', {
        error: error.message,
        orderId: order?._id,
        errorStack: error.stack
      });
      throw error;
    }
  }

  // Additional methods for different notification types
  static async createBillRequestNotification(order) {
    try {
      const billRequestNotification = await Notification.create({
        recipient: order.restaurant,
        recipientModel: 'RestaurantManagement',
        sender: order.customer,
        senderModel: 'User',
        type: 'bill_requested',
        content: `Bill requested for Table ${order.table}`,
        relatedOrder: order._id,
        metadata: {
          tableId: order.table,
          totalAmount: order.totalAmount
        }
      });

      // Emit notification
      const io = getIO();
      if (io) {
        io.to(order.restaurant.toString()).emit('newNotification', billRequestNotification);
      }

      return billRequestNotification;
    } catch (error) {
      logger.error('Failed to create bill request notification', {
        error: error.message,
        orderId: order?._id
      });
      throw error;
    }
  }
}

export default NotificationService;
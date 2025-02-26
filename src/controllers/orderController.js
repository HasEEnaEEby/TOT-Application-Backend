// controllers/orderController.js
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import NotificationService from '../services/notificationService.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

export const orderController = {
  // Create a new order
  createOrder: catchAsync(async (req, res) => {
    const { restaurant, table, items, totalAmount, specialInstructions } = req.body;
    const customerId = req.user._id;
    
    logger.info('Creating new order', { customerId, tableId: table });
    
    // Verify table exists and is available
    const tableDoc = await Table.findById(table);
    if (!tableDoc) {
      throw new AppError('Table not found', 404);
    }
    
    if (tableDoc.status !== 'available') {
      throw new AppError(`Table is ${tableDoc.status}. Please select an available table.`, 400);
    }
    
    // Create new order
    const order = await Order.create({
      customer: customerId,
      restaurant,
      table,
      items,
      totalAmount,
      specialInstructions,
      status: 'active'
    });
    
    // Update table status
    tableDoc.status = 'occupied';
    tableDoc.currentOrder = order._id;
    await tableDoc.save();
    
    logger.info('New order created', {
      orderId: order._id,
      customerId,
      tableId: table
    });
    
    // Create notifications for the order
    try {
      await NotificationService.createOrderNotification(order, 'order_placed');
    } catch (notificationError) {
      logger.error('Failed to create order notifications', {
        orderId: order._id,
        error: notificationError
      });
      // Non-critical error, so we'll still return the order
    }
    
    res.status(201).json({
      status: 'success',
      data: { order }
    });
  }),
  
  // Get customer's active order
  getActiveOrder: catchAsync(async (req, res) => {
    const customerId = req.user._id;
    
    const order = await Order.findOne({
      customer: customerId,
      status: { $in: ['active', 'preparing'] }
    }).populate('items.menuItem');
    
    if (!order) {
      throw new AppError('No active order found', 404);
    }
    
    res.status(200).json({
      status: 'success',
      data: { order }
    });
  }),
  
  // Add items to existing order
  addItemsToOrder: catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { items } = req.body;
    const customerId = req.user._id;
    
    // Verify order exists and belongs to customer
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    
    if (order.customer.toString() !== customerId.toString()) {
      throw new AppError('You can only modify your own orders', 403);
    }
    
    if (order.status !== 'active') {
      throw new AppError('Cannot modify orders that are already being prepared', 400);
    }
    
    // Add items to order
    order.items.push(...items);
    
    // Recalculate total
    order.totalAmount = calculateOrderTotal(order.items);
    await order.save();
    
    // Create notification for order update
    try {
      await NotificationService.createNotification({
        recipient: order.restaurant,
        recipientModel: 'RestaurantManagement',
        sender: customerId,
        senderModel: 'User',
        type: 'order_updated',
        content: `Order updated with additional items`,
        relatedOrder: order._id,
        metadata: {
          addedItemCount: items.length,
          newTotal: order.totalAmount
        }
      });
    } catch (notificationError) {
      logger.error('Failed to create order update notification', {
        orderId: order._id,
        error: notificationError
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { order }
    });
  }),
  
  // Request bill for order
  requestBill: catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const customerId = req.user._id;
    
    // Verify order exists and belongs to customer
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    
    if (order.customer.toString() !== customerId.toString()) {
      throw new AppError('You can only request bills for your own orders', 403);
    }
    
    // Update order status
    const previousStatus = order.status;
    order.status = 'billing';
    await order.save();
    
    // Update table status
    const table = await Table.findById(order.table);
    if (table) {
      table.status = 'billing';
      await table.save();
    }
    
    // Create notification for bill request
    try {
      await NotificationService.createNotification({
        recipient: order.restaurant,
        recipientModel: 'RestaurantManagement',
        sender: customerId,
        senderModel: 'User',
        type: 'bill_requested',
        content: `Bill requested for Order at Table ${order.table}`,
        relatedOrder: order._id,
        metadata: {
          tableId: order.table,
          billAmount: order.totalAmount
        }
      });
    } catch (notificationError) {
      logger.error('Failed to create bill request notification', {
        orderId: order._id,
        error: notificationError
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { 
        order,
        billAmount: order.totalAmount 
      }
    });
  }),

  // Get customer's order history
  getOrderHistory: catchAsync(async (req, res) => {
    const customerId = req.user._id;
    
    const orders = await Order.find({
      customer: customerId,
      status: 'completed'
    }).sort({ createdAt: -1 });
    
    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: { orders }
    });
  }),
  
  // Get restaurant's orders (for restaurant dashboard)
  getRestaurantOrders: catchAsync(async (req, res) => {
    const restaurantId = req.user._id;
    
    const orders = await Order.find({
      restaurant: restaurantId,
      status: { $ne: 'completed' }
    }).sort({ createdAt: -1 });
    
    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: { orders }
    });
  }),
  
  // Update order status (by restaurant)
  updateOrderStatus: catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const restaurantId = req.user._id;
    
    // Validate status
    if (!['active', 'preparing', 'ready', 'completed', 'cancelled'].includes(status)) {
      throw new AppError('Invalid order status', 400);
    }
    
    // Find order and verify it belongs to this restaurant
    const order = await Order.findOne({
      _id: orderId,
      restaurant: restaurantId
    });
    
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    
    // Store previous status for notification
    const previousStatus = order.status;
    
    // Update status
    order.status = status;
    await order.save();
    
    // If order completed or cancelled, free up the table
    if (status === 'completed' || status === 'cancelled') {
      const table = await Table.findById(order.table);
      if (table) {
        table.status = 'available';
        table.currentOrder = null;
        await table.save();
      }
    }
    
    // Create notification for status change
    try {
      await NotificationService.createNotification({
        recipient: order.customer,
        recipientModel: 'User',
        sender: restaurantId,
        senderModel: 'RestaurantManagement',
        type: 'order_status_change',
        content: `Your order status changed from ${previousStatus} to ${status}`,
        relatedOrder: order._id,
        metadata: {
          previousStatus,
          newStatus: status
        }
      });
    } catch (notificationError) {
      logger.error('Failed to create order status change notification', {
        orderId: order._id,
        error: notificationError
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { order }
    });
  })
};

// Helper function to calculate order total
const calculateOrderTotal = (items) => {
  return items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
};

export default orderController;
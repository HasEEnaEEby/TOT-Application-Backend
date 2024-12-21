const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { io } = require('../config/server'); 

// Create a new order (Guest or Customer)
const createOrder = async (req, res, next) => {
  const { restaurantId, tableId, guestSessionId, customerId, items, totalPrice, specialInstructions } = req.body;

  if (!items || items.length === 0) {
    return next(new AppError('Order items cannot be empty', 400));
  }

  try {
    const newOrder = new Order({
      restaurantId,
      tableId,
      guestSessionId,
      customerId,
      items,
      totalPrice,
      specialInstructions,
    });

    const savedOrder = await newOrder.save();

    // Emit event to notify customers (for example, "orderPlaced")
    io.to(savedOrder.guestSessionId).emit('orderPlaced', { orderId: savedOrder._id, message: 'Your order has been placed successfully!' });

    res.status(201).json({
      message: 'Order created successfully!',
      order: savedOrder,
    });
  } catch (error) {
    next(new AppError('Error creating order', 500));
  }
};

// Fetch all orders for a restaurant
const getAllOrders = async (req, res, next) => {
  if (!req.restaurant) {
    return next(new AppError('Not authorized, only restaurant staff can view orders', 403));
  }

  try {
    const orders = await Order.find({ restaurantId: req.restaurant._id }).populate('items.itemId', 'name price');

    res.status(200).json({
      message: 'Orders fetched successfully!',
      orders,
    });
  } catch (error) {
    next(new AppError('Error fetching orders', 500));
  }
};

// Fetch a single order by ID
const getOrderById = async (req, res, next) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId).populate('items.itemId', 'name price');

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    res.status(200).json({
      message: 'Order fetched successfully!',
      order,
    });
  } catch (error) {
    next(new AppError('Error fetching order', 500));
  }
};

// Update order status (Restaurant staff only)
const updateOrderStatus = async (req, res, next) => {
  const { orderId, newStatus } = req.body;

  if (!req.restaurant) {
    return next(new AppError('Not authorized, only restaurant staff can update the status', 403));
  }

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    if (!['Received', 'Preparing', 'Ready', 'Served'].includes(newStatus)) {
      return next(new AppError('Invalid status', 400));
    }

    order.status = newStatus;
    await order.save();

    // Emit the status update event to the specific room (customer's session)
    io.to(order.guestSessionId).emit('orderStatusUpdated', { orderId: order._id, status: newStatus });

    res.status(200).json({
      message: 'Order status updated successfully!',
      order,
    });
  } catch (error) {
    next(new AppError('Error updating order status', 500));
  }
};

// Delete an order
const deleteOrder = async (req, res, next) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findByIdAndDelete(orderId);

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    io.to(order.guestSessionId).emit('orderDeleted', { orderId: order._id, message: 'Your order has been deleted.' });

    res.status(200).json({
      message: 'Order deleted successfully!',
    });
  } catch (error) {
    next(new AppError('Error deleting order', 500));
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
};

import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import Table from '../models/Table.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import CustomerSession from '../models/CustomerSession.js';
import Restaurant from '../models/RestaurantManagement.js';
import logger from '../utils/logger.js';
import { generateUniqueToken } from '../utils/tokenGenerator.js';

export const customerController = {
  // Get customer profile
  getCustomerDetails: catchAsync(async (req, res) => {
    const customerId = req.user._id;
    
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }
    
    res.status(200).json({
      status: 'success',
      data: { customer }
    });
  }),
  
  // Update customer profile
  updateCustomerProfile: catchAsync(async (req, res) => {
    const customerId = req.user._id;
    const updateData = req.body;
    
    // Prevent updating restricted fields
    ['_id', 'email', 'password', 'role', 'createdAt'].forEach(field => delete updateData[field]);
    
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedCustomer) {
      throw new AppError('Customer not found', 404);
    }
    
    res.status(200).json({
      status: 'success',
      data: { customer: updatedCustomer }
    });
  }),
  
  // Create new customer (Usually handled by auth signup)
  createCustomer: catchAsync(async (req, res) => {
    const { name, email, password, phoneNumber } = req.body;
    
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      throw new AppError('Email already in use', 400);
    }
    
    const newCustomer = await Customer.create({
      name,
      email,
      password,
      phoneNumber,
      role: 'customer'
    });
    
    // Remove password from response
    newCustomer.password = undefined;
    
    res.status(201).json({
      status: 'success',
      data: { customer: newCustomer }
    });
  }),
  
  // Verify customer presence at restaurant using QR code
  verifyPresenceWithQR: catchAsync(async (req, res) => {
    const { qrCode } = req.body;
    const customerId = req.user._id;
    
    // Verify the QR code is valid
    const restaurant = await Restaurant.findOne({ qrCode });
    if (!restaurant) {
      throw new AppError('Invalid QR code', 400);
    }
    
    // Generate a session token
    const sessionToken = generateUniqueToken();
    
    // Store customer presence session
    await CustomerSession.create({
      customer: customerId,
      restaurant: restaurant._id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    });
    
    logger.info('✅ Customer verified presence at restaurant', {
      customerId,
      restaurantId: restaurant._id
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Presence verified successfully',
      data: {
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        sessionToken
      }
    });
  }),
  
  // Alternative: Verify presence using location
  verifyPresenceWithLocation: catchAsync(async (req, res) => {
    const { latitude, longitude, restaurantId } = req.body;
    const customerId = req.user._id;
    
    // Get restaurant location
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }
    
    // Check if restaurant has location data
    if (!restaurant.location || !restaurant.location.latitude || !restaurant.location.longitude) {
      throw new AppError('Restaurant location not available', 400);
    }
    
    // Calculate distance between customer and restaurant
    const distance = calculateDistance(
      latitude,
      longitude,
      restaurant.location.latitude,
      restaurant.location.longitude
    );
    
    // If not within reasonable distance (e.g., 100 meters)
    if (distance > 100) {
      throw new AppError('You must be at the restaurant to verify presence', 403);
    }
    
    // Generate a session token
    const sessionToken = generateUniqueToken();
    
    // Store customer presence session
    await CustomerSession.create({
      customer: customerId,
      restaurant: restaurant._id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    });
    
    logger.info('✅ Customer verified presence at restaurant using location', {
      customerId,
      restaurantId: restaurant._id,
      distance: `${distance.toFixed(2)} meters`
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Presence verified successfully',
      data: {
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        sessionToken
      }
    });
  }),
  
  // View all restaurants
  getAllRestaurants: catchAsync(async (req, res) => {
    const restaurants = await Restaurant.find({
      isActive: true
    }).select('name description location rating images');
    
    res.status(200).json({
      status: 'success',
      results: restaurants.length,
      data: { restaurants }
    });
  }),
  
  // Get restaurant details
  getRestaurantDetails: catchAsync(async (req, res) => {
    const { restaurantId } = req.params;
    
    const restaurant = await Restaurant.findById(restaurantId)
      .select('name description location rating images menu openingHours');
    
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }
    
    res.status(200).json({
      status: 'success',
      data: { restaurant }
    });
  }),
  
  // View available tables at a restaurant
  viewAvailableTables: catchAsync(async (req, res) => {
    const { restaurantId } = req.params;
    
    // Optionally verify customer is at this restaurant
    // Only if you want to restrict table viewing to physically present customers
    // await verifyCustomerPresence(req.user._id, restaurantId);
    
    const tables = await Table.find({
      restaurant: restaurantId,
      status: 'available'
    }).sort({ number: 1 });
    
    res.status(200).json({
      status: 'success',
      results: tables.length,
      data: { tables }
    });
  }),
  
  // Request a specific table
  requestTable: catchAsync(async (req, res) => {
    const { tableId } = req.params;
    const customerId = req.user._id;
    
    // Get the table
    const table = await Table.findById(tableId);
    if (!table) {
      throw new AppError('Table not found', 404);
    }
    
    // Verify it's available
    if (table.status !== 'available') {
      throw new AppError('This table is not available', 400);
    }
    
    // Verify customer is at the restaurant
    await verifyCustomerPresence(customerId, table.restaurant);
    
    // Update table status
    table.status = 'occupied';
    
    // Create a new order for this table
    const order = await Order.create({
      customer: customerId,
      restaurant: table.restaurant,
      table: tableId,
      status: 'active',
      items: []
    });
    
    // Link the order to the table
    table.currentOrder = order._id;
    await table.save();
    
    logger.info('✅ Table requested successfully', {
      customerId,
      tableId,
      restaurantId: table.restaurant,
      orderId: order._id
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Table requested successfully',
      data: { 
        table,
        order
      }
    });
  }),
  
  // View current order
  getCurrentOrder: catchAsync(async (req, res) => {
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
  
  // Add items to current order
  addToOrder: catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { items } = req.body;
    const customerId = req.user._id;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError('Items array is required', 400);
    }
    
    // Find the order and verify ownership
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    
    if (order.customer.toString() !== customerId.toString()) {
      throw new AppError('You can only modify your own orders', 403);
    }
    
    if (order.status !== 'active') {
      throw new AppError('Cannot modify orders that are already being prepared or completed', 400);
    }
    
    // Add items to the order
    items.forEach(item => {
      order.items.push(item);
    });
    
    // Update total amount
    order.totalAmount = calculateOrderTotal(order.items);
    
    await order.save();
    
    logger.info('✅ Items added to order', {
      customerId,
      orderId,
      itemCount: items.length
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Items added to order',
      data: { order }
    });
  }),
  
  // Request bill for the order
  requestBill: catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const customerId = req.user._id;
    
    // Find the order and verify ownership
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }
    
    if (order.customer.toString() !== customerId.toString()) {
      throw new AppError('You can only request bills for your own orders', 403);
    }
    
    // Update order status to 'billing'
    order.status = 'billing';
    await order.save();
    
    // Find the associated table and update its status to reflect billing
    // (Restaurant staff will handle the actual payment and table clearing)
    if (order.table) {
      const table = await Table.findById(order.table);
      if (table) {
        table.status = 'billing';
        await table.save();
      }
    }
    
    logger.info('✅ Bill requested', {
      customerId,
      orderId,
      amount: order.totalAmount
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Bill requested successfully',
      data: { 
        order,
        billAmount: order.totalAmount
      }
    });
  }),
  
  // View order history
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
  })
};

// Helper functions

// Verify customer is at the restaurant
const verifyCustomerPresence = async (customerId, restaurantId) => {
  const session = await CustomerSession.findOne({
    customer: customerId,
    restaurant: restaurantId,
    expiresAt: { $gt: new Date() }
  });
  
  if (!session) {
    throw new AppError('You must be physically present at the restaurant to perform this action', 403);
  }
  
  return true;
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Calculate order total amount
const calculateOrderTotal = (items) => {
  return items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
};

export default customerController;
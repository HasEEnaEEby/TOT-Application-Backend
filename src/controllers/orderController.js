// controllers/orderController.js
import cloudinary from '../config/cloudinary.js';
import Bill from '../models/Bill.js';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import NotificationService from '../services/notificationService.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

export const orderController = {

  generateBill : catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const restaurantId = req.user._id;
  
    console.log(`🔍 Attempting to generate bill for Order ID: ${orderId} by Restaurant ID: ${restaurantId}`);
  
    // Fetch order with all necessary population, ensuring references exist
    const order = await Order.findOne({
      _id: orderId,
      restaurant: restaurantId
    })
      .populate({
        path: 'restaurant',
        model: 'RestaurantManagement',
        select: '_id name address contactNumber'
      })
      .populate({
        path: 'customer',
        model: 'User',
        select: '_id username email'
      })
      .populate({
        path: 'table',
        model: 'Table',
        select: '_id number'
      });
  
    if (!order) {
      console.error(`❌ Order not found for ID: ${orderId}`);
      return res.status(404).json({ 
        status: 'error', 
        message: 'Order not found' 
      });
    }
  
    // Check if bill already exists
    const existingBill = await Bill.findOne({ order: orderId });
    if (existingBill) {
      console.log(`⚠ Bill already exists for order ${orderId}: ${existingBill._id}`);
      return res.status(200).json({
        status: 'success',
        data: { bill: existingBill }
      });
    }
  
    // Fallback checks with more robust error handling
    if (!order.restaurant) {
      order.restaurant = { _id: restaurantId };
    }
  
    if (!order.customer) {
      throw new AppError('Customer information is missing', 400);
    }
  
    if (!order.table) {
      throw new AppError('Table information is missing', 400);
    }
  
    // Calculate bill details
    const subtotal = order.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  
    const tax = subtotal * 0.13;
    const serviceCharge = subtotal * 0.10;
    const totalAmount = subtotal + tax + serviceCharge;
  
    console.log(`📝 Bill Calculation - Subtotal: ${subtotal}, Tax: ${tax}, Service Charge: ${serviceCharge}, Total: ${totalAmount}`);
  
    try {
      // Generate a unique bill number
      const billNumber = `BILL-${Date.now().toString().slice(-6)}`;
  
      // Create the bill
      const bill = await Bill.create({
        billNumber,
        order: order._id,
        restaurant: order.restaurant._id,
        customer: order.customer._id,
        table: order.table._id,
        items: order.items.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        })),
        subtotal,
        tax,
        serviceCharge,
        discount: 0,
        totalAmount,
        paymentStatus: 'pending'
      });
  
      console.log(`✅ Bill successfully created with ID: ${bill._id}`);
  
      res.status(201).json({
        status: 'success',
        data: { bill }
      });
    } catch (error) {
      console.error(`❌ Error creating bill:`, error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to generate bill',
        details: error.message 
      });
    }
  }),
  

  uploadBillQrCode: catchAsync(async (req, res, next) => {
    const { billId } = req.params;
    const file = req.file; // ✅ This should now contain the uploaded file
  
    if (!file) {
      console.error('⚠️ No file uploaded:', req.body, req.files);
      return next(new AppError('Please upload a QR code image', 400));
    }
  
    console.log(`✅ Received file: ${file.originalname}, Type: ${file.mimetype}`);
  
    try {
      // Check if bill exists
      const bill = await Bill.findById(billId);
      if (!bill) {
        return next(new AppError('Bill not found', 404));
      }
  
      console.log(`📜 Found bill: ${bill._id}, Uploading to Cloudinary...`);
  
      // Upload to Cloudinary
      const cloudinaryResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'bill-qr-codes', transformation: [{ width: 500, crop: "limit" }] },
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary Upload Error:', error);
              reject(error);
            } else {
              console.log(`✅ Upload successful: ${result.secure_url}`);
              resolve(result);
            }
          }
        );
  
        // Convert buffer to stream and pipe to Cloudinary
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream.pipe(uploadStream);
      });
  
      // Save QR Code URL to the bill
      bill.qrCodeUrl = cloudinaryResponse.secure_url;
      await bill.save();
  
      res.status(200).json({
        status: 'success',
        message: 'QR code uploaded successfully',
        data: { bill, qrCodeUrl: cloudinaryResponse.secure_url }
      });
    } catch (error) {
      console.error('❌ QR Code Upload Error:', error);
      return next(new AppError('Failed to upload QR code', 500));
    }
  }),  



  getBillDetails: catchAsync(async (req, res, next) => {
    const { orderId } = req.params;

    const bill = await Bill.findOne({ order: orderId })
      .populate('order')
      .populate('restaurant')
      .populate('customer')
      .populate('table');

    if (!bill) {
      return next(new AppError('Bill not found for this order', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { bill }
    });
  }),

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

    // Get orders by restaurant ID (for analytics) - NEW METHOD
    getOrdersByRestaurantId: catchAsync(async (req, res) => {
      const { restaurantId } = req.params;
      
      // Authorization check
      const requestingUserId = req.user._id.toString();
      const userRole = req.user.role;
      const userRestaurantId = req.user.restaurant ? req.user.restaurant.toString() : null;
      
      logger.info('Order authorization check:', {
        requestingUserId,
        userRole,
        userRestaurantId,
        requestedRestaurantId: restaurantId
      });
      
      // Only allow if user is admin OR the restaurantId matches their own restaurant
      if (userRole !== 'admin' && 
          userRestaurantId !== restaurantId && 
          requestingUserId !== restaurantId) {
        throw new AppError('You are not authorized to access this restaurant\'s orders', 403);
      }
      
      // Fetch orders for this restaurant
      const orders = await Order.find({ restaurant: restaurantId });
      
      res.status(200).json({
        status: 'success',
        results: orders.length,
        data: orders
      });
    }),
  
    updateOrderStatus: catchAsync(async (req, res) => {
      const { orderId } = req.params;
      const { status } = req.body;
      const restaurantId = req.user._id;
    
      console.log(`🛠 Updating order ${orderId} to status: ${status}`);
    
      // Validate status
      if (!['active', 'preparing', 'ready', 'completed', 'cancelled'].includes(status)) {
        console.error('❌ Invalid order status received:', status);
        throw new AppError('Invalid order status', 400);
      }
    
      // Find the order
      const order = await Order.findOne({ _id: orderId, restaurant: restaurantId })
        .populate('restaurant')
        .populate('customer')
        .populate('table');
    
      if (!order) {
        console.error(`❌ Order not found for ID: ${orderId}`);
        throw new AppError('Order not found', 404);
      }
    
      console.log(`✅ Order found. Previous status: ${order.status}`);
    
      // Store previous status
      const previousStatus = order.status;
    
      // Update order status
      order.status = status;
      await order.save();
    
      console.log(`✅ Order status updated to: ${status}`);
    
      // 🛠 If order is completed, generate a bill
      if (status === 'completed') {
        try {
          console.log(`🛠 Attempting to generate a bill for order: ${orderId}`);
    
          // Check if a bill already exists
          const existingBill = await Bill.findOne({ order: orderId });
    
          if (!existingBill) {
            console.log(`🔍 No existing bill found, proceeding to create...`);
    
            const subtotal = order.items.reduce((total, item) => {
              return total + (item.price * item.quantity);
            }, 0);
    
            const tax = subtotal * 0.13; // 13% tax
            const serviceCharge = subtotal * 0.10; // 10% service charge
            const totalAmount = subtotal + tax + serviceCharge;
    
            console.log(`📝 Bill Details - Subtotal: ${subtotal}, Tax: ${tax}, Service Charge: ${serviceCharge}, Total: ${totalAmount}`);
    
            const generatedBill = await Bill.create({
              order: order._id,
              restaurant: order.restaurant._id,
              customer: order.customer._id,
              table: order.table._id,
              items: order.items.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity
              })),
              subtotal,
              tax,
              serviceCharge,
              discount: 0,
              totalAmount
            });
    
            console.log(`✅ Bill successfully created with ID: ${generatedBill._id}`);
          } else {
            console.log(`⚠ Bill already exists: ${existingBill._id}`);
          }
        } catch (billError) {
          console.error(`❌ Error generating bill:`, billError);
        }
      }
    
      // Send response
      res.status(200).json({
        status: 'success',
        data: { order }
      });
    }),
     

completeOrder: catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  // Find the order
  const order = await Order.findById(orderId)
    .populate('restaurant')
    .populate('customer')
    .populate('table');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Update order status
  order.status = 'completed';
  await order.save();

  // Create bill
  const bill = await Bill.create({
    order: order._id,
    restaurant: order.restaurant._id,
    customer: order.customer._id,
    table: order.table._id,
    items: order.items.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity
    })),
    tax: order.tax || 0,
    serviceCharge: order.serviceCharge || 0,
    discount: order.discount || 0
  });

  res.status(200).json({
    status: 'success',
    message: 'Order completed and bill generated',
    data: { 
      order, 
      bill 
    }
  });
}),

};



// Helper function to calculate order total
const calculateOrderTotal = (items) => {
  return items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
};


export default orderController;
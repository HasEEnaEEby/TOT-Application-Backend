// customerTableController.js
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import logger from '../utils/logger.js';
import { qrCodeUtils } from '../utils/qrCodeUtils.js';

export const customerTableController = {
  // Get all tables for a restaurant (for browsing/display)
  getRestaurantTables: catchAsync(async (req, res) => {
    const { restaurantId } = req.params;
    
    if (!restaurantId) {
      throw new AppError('Restaurant ID is required', 400);
    }
    
    const tables = await Table.find({ 
      restaurant: restaurantId 
    }).sort({ number: 1 });
    
    // Format response to match Flutter's TableEntity
    const formattedTables = tables.map(table => ({
      id: table._id.toString(),
      number: table.number,
      capacity: table.capacity,
      restaurantId: table.restaurant.toString(),
      status: table.status,
      position: table.position,
      currentOrder: table.currentOrder?.toString(),
      lastUpdated: table.lastUpdated,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    }));
    
    res.status(200).json({
      status: "success",
      data: { tables: formattedTables }
    });
  }),
  
  // Get only available tables for a restaurant
  getAvailableTables: catchAsync(async (req, res) => {
    const { restaurantId } = req.params;
    
    if (!restaurantId) {
      throw new AppError('Restaurant ID is required', 400);
    }
    
    const tables = await Table.find({
      restaurant: restaurantId,
      status: 'available'
    }).sort({ number: 1 });
    
    // Format response to match Flutter's TableEntity
    const formattedTables = tables.map(table => ({
      id: table._id.toString(),
      number: table.number,
      capacity: table.capacity,
      restaurantId: table.restaurant.toString(),
      status: table.status,
      position: table.position,
      currentOrder: table.currentOrder?.toString(),
      lastUpdated: table.lastUpdated,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    }));
    
    res.status(200).json({
      status: "success",
      results: formattedTables.length,
      data: { tables: formattedTables }
    });
  }),
  
  // Get details for a specific table
  getTableById: catchAsync(async (req, res) => {
    const { tableId } = req.params;
    
    const table = await Table.findById(tableId);
    
    if (!table) {
      throw new AppError('Table not found', 404);
    }
    
    // Format response to match Flutter's TableEntity
    const formattedTable = {
      id: table._id.toString(),
      number: table.number,
      capacity: table.capacity,
      restaurantId: table.restaurant.toString(),
      status: table.status,
      position: table.position,
      currentOrder: table.currentOrder?.toString(),
      lastUpdated: table.lastUpdated,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    };
    
    res.status(200).json({
      status: "success",
      data: { table: formattedTable }
    });
  }),
  
  // Validate a QR code for a table
  validateTableQR: catchAsync(async (req, res) => {
    const { qrData } = req.body;
    
    if (!qrData) {
      throw new AppError('QR code data is required', 400);
    }
    
    let parsedQRData;
    try {
      // If string, parse it
      if (typeof qrData === 'string') {
        parsedQRData = JSON.parse(qrData);
      } else {
        parsedQRData = qrData;
      }
    } catch (error) {
      logger.error('Invalid QR code format', { error: error.message });
      throw new AppError('Invalid QR code format', 400);
    }
    
    // Extract table ID and token
    const { r: restaurantId, t: tableId, v: token } = parsedQRData;
    
    if (!tableId || !token) {
      throw new AppError('QR code missing required data', 400);
    }
    
    // Find the table
    const table = await Table.findById(tableId);
    if (!table) {
      throw new AppError('Table not found', 404);
    }
    
    // Validate the QR code
    const isValid = qrCodeUtils.validateQRCodeData(parsedQRData, table);
    
    if (!isValid) {
      throw new AppError('Invalid or expired QR code', 400);
    }
    
    // Format response to match Flutter's TableEntity
    const formattedTable = {
      id: table._id.toString(),
      number: table.number,
      capacity: table.capacity,
      restaurantId: table.restaurant.toString(),
      status: table.status,
      position: table.position,
      currentOrder: table.currentOrder?.toString(),
      lastUpdated: table.lastUpdated,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    };
    
    // Return table info with validation status
    res.status(200).json({
      status: "success",
      data: {
        validated: true,
        table: formattedTable,
        sessionToken: token // Return the token for subsequent operations
      }
    });
  }),
  
  // Request a table (for customers)
  requestTable: catchAsync(async (req, res) => {
    const { tableId } = req.params;
    const { sessionToken } = req.body; // Add sessionToken from QR validation
    const customerId = req.user._id;
    
    // Get the table
    const table = await Table.findById(tableId);
    if (!table) {
      throw new AppError('Table not found', 404);
    }
    
    // Verify it's available
    if (table.status !== 'available') {
      throw new AppError(`This table is ${table.status}. Please select another table.`, 400);
    }
    
    // Validate QR code token if provided
    if (sessionToken) {
      if (!table.validateQRCode(sessionToken)) {
        throw new AppError('Invalid or expired QR code. Please scan again.', 401);
      }
      
      logger.info('Table QR code validated successfully', {
        tableId,
        customerId
      });
    }
    
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
    
    // Format response to match Flutter's TableEntity
    const formattedTable = {
      id: table._id.toString(),
      number: table.number,
      capacity: table.capacity,
      restaurantId: table.restaurant.toString(),
      status: table.status,
      position: table.position,
      currentOrder: order._id.toString(),
      lastUpdated: table.lastUpdated,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    };
    
    res.status(200).json({
      status: 'success',
      message: 'Table requested successfully',
      data: { 
        table: formattedTable,
        orderId: order._id.toString()
      }
    });
  }),
  
  // Verify table QR code before placing an order
  verifyTableForOrder: catchAsync(async (req, res) => {
    const { tableId } = req.params;
    const { sessionToken } = req.body;
    const customerId = req.user._id;
    
    // Validate required fields
    if (!sessionToken) {
      throw new AppError('Session token is required', 400);
    }
    
    // Find the table
    const table = await Table.findById(tableId);
    if (!table) {
      throw new AppError('Table not found', 404);
    }
    
    // Validate token against the table
    if (!table.validateQRCode(sessionToken)) {
      throw new AppError('Invalid or expired session token', 401);
    }
    
    // Check if table is occupied
    if (table.status !== 'occupied') {
      throw new AppError('Table must be occupied to place an order', 400);
    }
    
    logger.info('Table verified for order', { 
      tableId, 
      customerId,
      restaurantId: table.restaurant 
    });
    
    // Format response to match Flutter's TableEntity
    const formattedTable = {
      id: table._id.toString(),
      number: table.number,
      capacity: table.capacity,
      restaurantId: table.restaurant.toString(),
      status: table.status,
      position: table.position,
      currentOrder: table.currentOrder?.toString(),
      lastUpdated: table.lastUpdated,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    };
    
    // Return verification success
    res.status(200).json({
      status: 'success',
      message: 'Table verification successful',
      data: { 
        verificationStatus: 'verified',
        table: formattedTable,
        orderReady: true
      }
    });
  })
};

export default customerTableController;
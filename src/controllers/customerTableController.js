// customerTableController.js
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

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
  
  // Request a table (for customers)
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
      throw new AppError(`This table is ${table.status}. Please select another table.`, 400);
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
  })
};

export default customerTableController;
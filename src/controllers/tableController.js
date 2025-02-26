import Table from '../models/Table.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

export const tableController = {
  // Get tables for the authenticated restaurant
  getRestaurantTables: catchAsync(async (req, res) => {
    const restaurantId = req.user._id;
    
    // Log for debugging
    logger.info('Fetching tables for restaurant', { restaurantId });
    
    const tables = await Table.find({ restaurant: restaurantId }).sort({ number: 1 });
    
    res.status(200).json({
      status: "success",
      data: { tables }
    });
  }),

  // Create a new table
  createTable: catchAsync(async (req, res) => {
    const { number, capacity, position, status = 'available' } = req.body;
    const restaurantId = req.user._id;
    
    // Check for duplicate table number
    const existingTable = await Table.findOne({ 
      restaurant: restaurantId,
      number: number
    });
    
    if (existingTable) {
      throw new AppError('A table with this number already exists in this restaurant', 400);
    }
    
    // Create the table
    const table = await Table.create({
      restaurant: restaurantId,
      number,
      capacity,
      position,
      status
    });
    
    logger.info('Table created successfully', { 
      tableId: table._id,
      restaurantId
    });
    
    res.status(201).json({
      status: 'success',
      data: { table }
    });
  }),

  // Update a table
  updateTable: catchAsync(async (req, res) => {
    const { tableId } = req.params;
    const updateData = req.body;
    const restaurantId = req.user._id;
    
    // Prevent updating restricted fields
    ['_id', 'id', 'restaurant', 'createdAt'].forEach(field => delete updateData[field]);
    
    // Find table and verify ownership
    const table = await Table.findOne({ 
      _id: tableId,
      restaurant: restaurantId
    });
    
    if (!table) {
      throw new AppError('Table not found or does not belong to this restaurant', 404);
    }
    
    // If updating table number, check for uniqueness
    if (updateData.number && updateData.number !== table.number) {
      const existingTable = await Table.findOne({
        restaurant: restaurantId,
        number: updateData.number,
        _id: { $ne: tableId }
      });
      
      if (existingTable) {
        throw new AppError('A table with this number already exists', 400);
      }
    }
    
    // Update the table
    const updatedTable = await Table.findByIdAndUpdate(
      tableId,
      updateData,
      { new: true, runValidators: true }
    );
    
    logger.info('Table updated successfully', { 
      tableId,
      restaurantId
    });
    
    res.status(200).json({
      status: 'success',
      data: { table: updatedTable }
    });
  }),

  // Delete a table
  deleteTable: catchAsync(async (req, res) => {
    const { tableId } = req.params;
    const restaurantId = req.user._id;
    
    // Find table and verify ownership
    const table = await Table.findOne({ 
      _id: tableId,
      restaurant: restaurantId
    });
    
    if (!table) {
      throw new AppError('Table not found or does not belong to this restaurant', 404);
    }
    
    // Check if table is occupied
    if (table.status === 'occupied') {
      throw new AppError('Cannot delete an occupied table', 400);
    }
    
    // Delete the table
    await Table.findByIdAndDelete(tableId);
    
    logger.info('Table deleted successfully', { 
      tableId,
      restaurantId
    });
    
    res.status(204).send();
  }),

  // Update table status
  updateTableStatus: catchAsync(async (req, res) => {
    const { tableId } = req.params;
    const { status } = req.body;
    const restaurantId = req.user._id;
    
    // Validate status
    if (!status || !['available', 'occupied', 'reserved', 'unavailable'].includes(status)) {
      throw new AppError('Invalid table status', 400);
    }
    
    // Find table and verify ownership
    const table = await Table.findOne({ 
      _id: tableId,
      restaurant: restaurantId
    });
    
    if (!table) {
      throw new AppError('Table not found or does not belong to this restaurant', 404);
    }
    
    // Update the status
    table.status = status;
    await table.save();
    
    logger.info('Table status updated successfully', { 
      tableId,
      restaurantId,
      newStatus: status
    });
    
    res.status(200).json({
      status: 'success',
      data: { table }
    });
  }),

  // Customer endpoints
  
  // Get available tables for a specific restaurant
  getAvailableTables: catchAsync(async (req, res) => {
    const { restaurantId } = req.params;
    
    const tables = await Table.find({ 
      restaurant: restaurantId,
      status: 'available' 
    }).sort({ number: 1 });
    
    res.status(200).json({
      status: "success",
      data: { tables }
    });
  }),

  // Request a table (for customer app)
  requestTable: catchAsync(async (req, res) => {
    const { tableId } = req.params;
    const customerId = req.user._id;
    
    // Verify table exists and is available
    const table = await Table.findById(tableId);
    if (!table) {
      throw new AppError('Table not found', 404);
    }
    
    if (table.status !== 'available') {
      throw new AppError('Table is not available', 400);
    }
    
    // Update table status
    table.status = 'occupied';
    await table.save();
    
    logger.info('Table requested by customer', { 
      tableId, 
      customerId,
      restaurantId: table.restaurant 
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Table request successful',
      data: { table }
    });
  })
};

export default tableController;
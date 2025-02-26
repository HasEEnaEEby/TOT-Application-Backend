import Table from '../models/Table.js';
import AppError from '../utils/AppError.js';

export const getRestaurantTables = async (restaurantId) => {
  return await Table.find({ restaurant: restaurantId }).sort({ number: 1 });
};

export const getTableById = async (tableId) => {
  const table = await Table.findById(tableId);
  if (!table) {
    throw new AppError('Table not found', 404);
  }
  return table;
};

export const createNewTable = async (tableData, restaurantId) => {
  // Check if table number already exists for this restaurant
  const existingTable = await Table.findOne({ 
    restaurant: restaurantId, 
    number: tableData.number 
  });
  
  if (existingTable) {
    throw new AppError('A table with this number already exists in this restaurant', 400);
  }
  
  return await Table.create({
    ...tableData,
    restaurant: restaurantId,
    status: 'available'
  });
};

export const updateTableById = async (tableId, updateData) => {
  // If trying to update table number, check if it would cause a duplicate
  if (updateData.number) {
    const table = await Table.findById(tableId);
    if (!table) {
      throw new AppError('Table not found', 404);
    }
    
    const existingTable = await Table.findOne({
      restaurant: table.restaurant,
      number: updateData.number,
      _id: { $ne: tableId }
    });
    
    if (existingTable) {
      throw new AppError('A table with this number already exists in this restaurant', 400);
    }
  }
  
  const updatedTable = await Table.findByIdAndUpdate(
    tableId,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!updatedTable) {
    throw new AppError('Table not found', 404);
  }
  
  return updatedTable;
};

export const deleteTableById = async (tableId) => {
  const result = await Table.findByIdAndDelete(tableId);
  if (!result) {
    throw new AppError('Table not found', 404);
  }
  return true;
};
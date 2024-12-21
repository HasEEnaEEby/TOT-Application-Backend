const Table = require('../models/Table');

const assignTable = async (tableNumber, userId, userType) => {
  const table = await Table.findOne({ tableNumber });
  if (!table) throw new Error('Table not found');
  if (table.status === 'Occupied') throw new Error('Table already occupied');

  table.status = 'Occupied';
  table.assignedTo = userId;
  table.assignedToType = userType;
  table.assignedAt = new Date();

  await table.save();
  return table;
};

const releaseTable = async (tableNumber) => {
  const table = await Table.findOne({ tableNumber });
  if (!table) throw new Error('Table not found');
  
  table.status = 'Available';
  table.assignedTo = null;
  table.assignedToType = null;
  table.assignedAt = null;

  await table.save();
  return table;
};

const getTableStatus = async (tableNumber) => {
  const table = await Table.findOne({ tableNumber });
  if (!table) throw new Error('Table not found');
  return table;
};

module.exports = {
  assignTable,
  releaseTable,
  getTableStatus,
};

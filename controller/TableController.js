const tableService = require('../services/TableService');

// Assign a table
const assignTable = async (req, res) => {
  try {
    const { tableNumber, userId, userType } = req.body;
    const table = await tableService.assignTable(tableNumber, userId, userType);
    res.status(200).json({
      message: 'Table assigned successfully',
      table,
    });
  } catch (error) {
    console.error('Error assigning table:', error);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

// Release a table
const releaseTable = async (req, res) => {
  try {
    const { tableNumber } = req.body;
    const table = await tableService.releaseTable(tableNumber);
    res.status(200).json({
      message: 'Table released successfully',
      table,
    });
  } catch (error) {
    console.error('Error releasing table:', error);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

// Get table status
const getTableStatus = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const table = await tableService.getTableStatus(tableNumber);
    res.status(200).json(table);
  } catch (error) {
    console.error('Error fetching table status:', error);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

module.exports = {
  assignTable,
  releaseTable,
  getTableStatus,
};

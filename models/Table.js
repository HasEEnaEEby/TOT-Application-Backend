const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['Available', 'Occupied'],
    default: 'Available',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'assignedToType',
  },
  assignedToType: {
    type: String,
    enum: ['User', 'Guest'],
  },
  assignedAt: {
    type: Date,
    default: null,
  },
});

const Table = mongoose.model('Table', tableSchema);

module.exports = Table;

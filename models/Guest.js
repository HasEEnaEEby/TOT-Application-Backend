const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now, 
  },
  expiresAt: {
    type: Date,
    required: true, 
  },
});

module.exports = mongoose.model('Guest', guestSchema);

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    tableId: {
      type: String, 
      required: true,
    },
    guestSessionId: {
      type: String, 
      required: false, 
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: false, 
    },
    items: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    specialInstructions: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Received', 'Preparing', 'Ready', 'Served'],
      default: 'Received',
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);

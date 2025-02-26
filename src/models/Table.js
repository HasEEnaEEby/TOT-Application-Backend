import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantManagement',
    required: [true, 'Table must belong to a restaurant']
  },
  number: {
    type: Number,
    required: [true, 'Table number is required'],
    min: [1, 'Table number must be greater than 0']
  },
  capacity: {
    type: Number,
    required: [true, 'Table capacity is required'],
    min: [1, 'Table capacity must be at least 1']
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'unavailable'],
    default: 'available'
  },
  position: {
    x: {
      type: Number,
      required: [true, 'X coordinate is required']
    },
    y: {
      type: Number,
      required: [true, 'Y coordinate is required']
    }
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure table numbers are unique per restaurant
tableSchema.index({ restaurant: 1, number: 1 }, { unique: true });

// Update lastUpdated timestamp on modifications
tableSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

tableSchema.pre('findOneAndUpdate', function(next) {
  this.set({ lastUpdated: new Date() });
  next();
});

export const Table = mongoose.model('Table', tableSchema);

export default Table;
import mongoose from 'mongoose';

// Define statuses as a const array
const SUBSCRIPTION_STATUSES = ['active', 'inactive', 'expired', 'pending'];
const SUBSCRIPTION_PLANS = ['basic', 'pro', 'premium'];
const ACTIVITY_ACTIONS = [
  'LOGIN', 
  'LOGOUT', 
  'PROFILE_UPDATE', 
  'MENU_ITEM_ADDED', 
  'MENU_ITEM_UPDATED', 
  'MENU_ITEM_DELETED',
  'SUBSCRIPTION_UPDATED',
  'ORDER_RECEIVED',
  'ORDER_COMPLETED',
  'ACCOUNT_SETTINGS_CHANGED',
  'OPERATING_HOURS_UPDATED'
];

// Comprehensive IP Address Validator
function validateIpAddress(ip) {
  // If no IP is provided, return null (valid)
  if (!ip) return null;

  // Trim and convert to string
  const trimmedIp = String(ip).trim();
  
  // If empty string, return null
  if (trimmedIp === '') return null;

  // Regular expression for IPv4 with octet validation
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  
  const match = trimmedIp.match(ipv4Regex);
  
  // If no match, return null
  if (!match) return null;

  // Check each octet is between 0 and 255
  const octets = match.slice(1).map(Number);
  const isValidIp = octets.every(octet => octet >= 0 && octet <= 255);

  return isValidIp ? trimmedIp : null;
}

const restaurantManagementSchema = new mongoose.Schema({
  // Reference to the restaurant user
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Restaurant reference is required'],
    unique: true
  },

  tables: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  }],

  // Comprehensive Subscription Details
  subscription: {
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: 'inactive'
    },
    plan: {
      type: String,
      enum: SUBSCRIPTION_PLANS,
      default: 'basic'
    },
    amount: {
      type: Number,
      default: 0,
      min: [0, 'Subscription amount cannot be negative']
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    renewalDate: Date,
    autoRenew: {
      type: Boolean,
      default: false
    }
  },

  // Detailed Subscription History
  subscriptionHistory: [{
    plan: {
      type: String,
      enum: SUBSCRIPTION_PLANS,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Subscription amount cannot be negative']
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: 'active'
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash']
    },
    transactionId: String
  }],

  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    branch: String
  },

  paymentQRCode: {
    type: String, // URL to the QR code image
  },

  // Comprehensive Performance Metrics
  metrics: {
    totalRevenue: {
      type: Number,
      default: 0,
      min: [0, 'Revenue cannot be negative']
    },
    orderCount: {
      type: Number,
      default: 0,
      min: [0, 'Order count cannot be negative']
    },
    successfulOrders: {
      type: Number,
      default: 0,
      min: [0, 'Successful order count cannot be negative']
    },
    cancelledOrders: {
      type: Number,
      default: 0,
      min: [0, 'Cancelled order count cannot be negative']
    },
    averageOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Average order value cannot be negative']
    },
    peakHours: [{
      hour: {
        type: Number,
        min: 0,
        max: 23
      },
      orderCount: {
        type: Number,
        default: 0
      }
    }]
  },

  // Enhanced Rating System
  rating: {
    total: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    },
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    breakdowns: {
      '5star': { type: Number, default: 0 },
      '4star': { type: Number, default: 0 },
      '3star': { type: Number, default: 0 },
      '2star': { type: Number, default: 0 },
      '1star': { type: Number, default: 0 }
    }
  },

  // Detailed Status Tracking
  status: {
    isOnline: {
      type: Boolean,
      default: false
    },
    lastActive: Date,
    lastLogin: Date,
    ipAddress: {
      type: String,
      default: null,
      validate: {
        validator: function(v) {
          // Allow null, undefined, or empty string
          if (v === null || v === undefined || v === '') return true;
          
          // If a value is provided, validate it
          return /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.test(v) && 
                 v.split('.').every(octet => {
                   const num = parseInt(octet, 10);
                   return num >= 0 && num <= 255;
                 });
        },
        message: 'Invalid IP address format'
      }
    },
    deviceInfo: {
      browser: String,
      platform: String
    }
  },

  // Comprehensive Activity Logging
  activityLog: [{
    action: {
      type: String,
      required: true,
      enum: ACTIVITY_ACTIONS
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: null,
      validate: {
        validator: function(v) {
          // Allow null, undefined, or empty string
          if (v === null || v === undefined || v === '') return true;
          
          // If a value is provided, validate it
          return /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.test(v) && 
                 v.split('.').every(octet => {
                   const num = parseInt(octet, 10);
                   return num >= 0 && num <= 255;
                 });
        },
        message: 'Invalid IP address format'
      }
    },
    location: {
      city: String,
      country: String
    }
  }],

  // Advanced Feature Access
  features: {
    menuCustomization: {
      type: Boolean,
      default: false
    },
    analyticsAccess: {
      type: Boolean,
      default: false
    },
    promotionalTools: {
      type: Boolean,
      default: false
    },
    tableReservation: {
      type: Boolean,
      default: false
    },
    multiLocationSupport: {
      type: Boolean,
      default: false
    }
  },

  // Performance Insights
  performance: {
    popularItems: [{
      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem'
      },
      orderCount: {
        type: Number,
        default: 0
      },
      revenue: {
        type: Number,
        default: 0
      }
    }],
    topSellingCategories: [{
      category: {
        type: String,
        enum: ['appetizer', 'main course', 'dessert', 'beverage', 'special']
      },
      orderCount: {
        type: Number,
        default: 0
      },
      revenue: {
        type: Number,
        default: 0
      }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for subscription status
restaurantManagementSchema.virtual('subscriptionStatus').get(function() {
  const now = new Date();
  if (!this.subscription.endDate) return 'inactive';
  
  if (now > this.subscription.endDate) return 'expired';
  if (now >= this.subscription.startDate && now <= this.subscription.endDate) return 'active';
  
  return 'inactive';
});

// Pre-save hook to calculate average rating and update subscription status
restaurantManagementSchema.pre('save', function(next) {
  // Calculate average rating
  if (this.rating.count > 0) {
    this.rating.average = Number((this.rating.total / this.rating.count).toFixed(2));
  } else {
    this.rating.average = 0;
  }

  // Ensure rating is between 0 and 5
  this.rating.average = Math.min(Math.max(this.rating.average, 0), 5);

  // Automatically update subscription status
  this.subscription.status = this.subscriptionStatus;

  next();
});

// Method to add a new subscription
restaurantManagementSchema.methods.addSubscription = function(
  amount, 
  plan = 'pro', 
  duration = 30,
  paymentMethod = 'credit_card',
  transactionId = null
) {
  const now = new Date();
  const endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

  // Explicitly clear and reset IP-related fields
  this.status.ipAddress = null;
  this.status.deviceInfo = {
    browser: null,
    platform: null
  };

  // Clear any existing history to prevent validation issues
  this.subscriptionHistory = [];

  // Add to subscription history with validated values
  this.subscriptionHistory.push({
    plan,
    amount,
    startDate: now,
    endDate: endDate,
    status: 'active',
    paymentMethod: paymentMethod || 'credit_card', // Ensure a valid payment method
    transactionId: transactionId || undefined
  });

  // Clear any existing activity log to prevent validation issues
  this.activityLog = [];

  // Log subscription activity with minimal details and no IP
  this.logActivity('SUBSCRIPTION_UPDATED', {
    plan,
    amount,
    duration
  }, null, null);

  // Update current subscription
  this.subscription = {
    status: 'active',
    plan,
    amount,
    startDate: now,
    endDate: endDate,
    renewalDate: endDate,
    autoRenew: false
  };

  return this;
};

// Update the logActivity method to be more flexible with validation
restaurantManagementSchema.methods.logActivity = function(
  action, 
  details = {},
  ipAddress = null,
  location = null
) {
  // Validate action
  if (!ACTIVITY_ACTIONS.includes(action)) {
    throw new Error(`Invalid activity action: ${action}`);
  }

  // Validate IP address
  const validatedIpAddress = validateIpAddress(ipAddress);

  // Create a clean activity log entry
  const activityEntry = {
    action,
    timestamp: new Date(),
    details: details || {},
    ipAddress: validatedIpAddress,
    location: location || undefined
  };

  this.activityLog.push(activityEntry);

  return this;
};

// Method to safely set IP address
restaurantManagementSchema.methods.setIpAddress = function(ipAddress) {
  const validatedIp = validateIpAddress(ipAddress);
  
  if (validatedIp) {
    this.status.ipAddress = validatedIp;
  }

  return this;
};

// Method to update rating with more granular tracking
restaurantManagementSchema.methods.updateRating = function(
  newRating
) {
  // Validate rating
  if (newRating < 1 || newRating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  this.rating.total += newRating;
  this.rating.count += 1;
  
  // Track rating breakdowns
  switch(Math.round(newRating)) {
    case 5:
      this.rating.breakdowns['5star']++;
      break;
    case 4:
      this.rating.breakdowns['4star']++;
      break;
    case 3:
      this.rating.breakdowns['3star']++;
      break;
    case 2:
      this.rating.breakdowns['2star']++;
      break;
    case 1:
      this.rating.breakdowns['1star']++;
      break;
  }
  
  return this;
};

// Method to calculate and update metrics
restaurantManagementSchema.methods.updateMetrics = function(
  revenue, 
  orderCount, 
  successfulOrders, 
  cancelledOrders
) {
  // Update revenue and order metrics
  this.metrics.totalRevenue += revenue;
  this.metrics.orderCount += orderCount;
  this.metrics.successfulOrders += successfulOrders;
  this.metrics.cancelledOrders += cancelledOrders;

  // Recalculate average order value
  if (this.metrics.orderCount > 0) {
    this.metrics.averageOrderValue = 
      this.metrics.totalRevenue / this.metrics.orderCount;
  }

  return this;
};
restaurantManagementSchema.virtual('tableCount').get(function() {
  return this.tables.length;
});


export const RestaurantManagement = mongoose.model('RestaurantManagement', restaurantManagementSchema);
export default RestaurantManagement;
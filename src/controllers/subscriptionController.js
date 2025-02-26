// src/controllers/subscriptionController.js
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const subscriptionController = {
  getAllSubscriptions: catchAsync(async (req, res) => {
    logger.info('Fetching all subscriptions');

    // Get all restaurants with subscription info
    const restaurants = await User.find({
      role: 'restaurant',
      subscriptionPro: { $in: [true, false] } 
    }).select('restaurantName email subscriptionAmount subscriptionPro lastLogin status');

    // Transform the data to match frontend expectations
    const subscriptions = restaurants.map(restaurant => ({
      _id: restaurant._id,
      restaurantName: restaurant.restaurantName,
      planType: restaurant.subscriptionPro ? 'premium' : 'basic',
      startDate: restaurant.lastLogin || restaurant.createdAt,
      expiryDate: restaurant.lastLogin 
        ? new Date(new Date(restaurant.lastLogin).setMonth(new Date(restaurant.lastLogin).getMonth() + 1))
        : new Date(new Date(restaurant.createdAt).setMonth(new Date(restaurant.createdAt).getMonth() + 1)),
      paymentStatus: restaurant.subscriptionPro ? 'paid' : 'pending',
      monthlyFee: restaurant.subscriptionAmount || 16000
    }));

    logger.info(`Found ${subscriptions.length} subscriptions`);

    res.status(200).json({
      status: 'success',
      data: subscriptions
    });
  }),

  renewSubscription: catchAsync(async (req, res) => {
    const { id } = req.params;
    logger.info(`Renewing subscription for restaurant ${id}`);

    const restaurant = await User.findById(id);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Update subscription status
    restaurant.subscriptionPro = true;
    restaurant.subscriptionAmount = 16000;
    restaurant.lastLogin = new Date(); // Using lastLogin as subscription renewal date
    await restaurant.save();

    logger.info(`Subscription renewed for restaurant ${id}`);

    res.status(200).json({
      status: 'success',
      message: 'Subscription renewed successfully',
      data: {
        _id: restaurant._id,
        restaurantName: restaurant.restaurantName,
        planType: 'premium',
        startDate: restaurant.lastLogin,
        expiryDate: new Date(new Date(restaurant.lastLogin).setMonth(new Date(restaurant.lastLogin).getMonth() + 1)),
        paymentStatus: 'paid',
        monthlyFee: 16000
      }
    });
  }),

  createSubscription: catchAsync(async (req, res) => {
    const { restaurantId, monthlyFee = 16000 } = req.body;
    logger.info(`Creating subscription for restaurant ${restaurantId}`);

    const restaurant = await User.findOneAndUpdate(
      { _id: restaurantId, role: 'restaurant' },
      {
        subscriptionPro: true,
        subscriptionAmount: monthlyFee,
        lastLogin: new Date() // Using lastLogin as subscription start date
      },
      { new: true }
    );

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    logger.info(`Subscription created for restaurant ${restaurantId}`);

    res.status(201).json({
      status: 'success',
      data: {
        _id: restaurant._id,
        restaurantName: restaurant.restaurantName,
        planType: 'premium',
        startDate: restaurant.lastLogin,
        expiryDate: new Date(new Date(restaurant.lastLogin).setMonth(new Date(restaurant.lastLogin).getMonth() + 1)),
        paymentStatus: 'paid',
        monthlyFee
      }
    });
  }),

  updatePaymentStatus: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    logger.info(`Updating payment status for restaurant ${id} to ${paymentStatus}`);

    const restaurant = await User.findById(id);
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Update subscription status based on payment status
    restaurant.subscriptionPro = paymentStatus === 'paid';
    await restaurant.save();

    logger.info(`Payment status updated for restaurant ${id}`);

    res.status(200).json({
      status: 'success',
      data: {
        _id: restaurant._id,
        restaurantName: restaurant.restaurantName,
        planType: restaurant.subscriptionPro ? 'premium' : 'basic',
        paymentStatus: paymentStatus,
        monthlyFee: restaurant.subscriptionAmount || 16000
      }
    });
  })
};

export default subscriptionController;
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const incomeController = {
  getIncomeData: catchAsync(async (req, res) => {
    logger.info('Fetching income data');

    // Get all restaurants with subscription info
    const restaurants = await User.find({
      role: 'restaurant'
    }).select('restaurantName subscriptionAmount subscriptionPro lastLogin createdAt status');

    const monthlyData = await processMonthlyData(restaurants);
    
    const stats = calculateStats(restaurants, monthlyData);
    
    const transactions = getRecentTransactions(restaurants);

    logger.info('Income data retrieved successfully');

    res.status(200).json({
      status: 'success',
      message: 'Income data retrieved successfully',
      data: {
        monthlyData,
        stats,
        transactions
      }
    });
  }),

  generateReport: catchAsync(async (req, res) => {
    logger.info('Generating income report');
    
    const restaurants = await User.find({
      role: 'restaurant'
    }).select('restaurantName subscriptionAmount subscriptionPro lastLogin createdAt status');

    const monthlyData = await processMonthlyData(restaurants);
    const stats = calculateStats(restaurants, monthlyData);

    res.status(200).json({
      status: 'success',
      message: 'Report generated successfully',
      data: {
        monthlyData,
        stats,
        dateGenerated: new Date()
      }
    });
  })
};

async function processMonthlyData(restaurants) {
  const now = new Date();
  const monthlyData = [];
  
  // Get last 6 months
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthName = month.toLocaleString('default', { month: 'short' });
    
    // Filter subscriptions for this month
    const monthRestaurants = restaurants.filter(restaurant => {
      const subscriptionDate = restaurant.lastLogin || restaurant.createdAt;
      return subscriptionDate >= month && subscriptionDate < nextMonth;
    });

    // Calculate different income types
    const subscriptionIncome = monthRestaurants
      .filter(restaurant => !restaurant.subscriptionPro)
      .reduce((sum, restaurant) => sum + (restaurant.subscriptionAmount || 0), 0);

    const premiumPackageIncome = monthRestaurants
      .filter(restaurant => restaurant.subscriptionPro)
      .reduce((sum, restaurant) => sum + (restaurant.subscriptionAmount || 16000), 0);
    
    monthlyData.push({
      month: monthName,
      subscriptionIncome,
      premiumPackageIncome,
      totalIncome: subscriptionIncome + premiumPackageIncome
    });
  }
  
  return monthlyData;
}

function calculateStats(restaurants, monthlyData) {
    // Calculate total revenue from all months
    const totalRevenue = monthlyData.reduce((sum, month) => sum + month.totalIncome, 0);
    
    // Calculate monthly growth
    const lastMonth = monthlyData[monthlyData.length - 1].totalIncome;
    const previousMonth = monthlyData[monthlyData.length - 2]?.totalIncome || lastMonth;
    const monthlyGrowth = previousMonth ? ((lastMonth - previousMonth) / previousMonth * 100) : 0;
    
    // Calculate projected income based on growth trend
    const projectedIncome = lastMonth * (1 + monthlyGrowth / 100);
  
    // Count active subscriptions (both basic and premium)
    const activeSubscriptions = restaurants.filter(r => 
      r.status === 'approved' && r.subscriptionAmount && !r.subscriptionPro
    ).length;
  
    // Count premium packages
    const premiumPackages = restaurants.filter(r => 
      r.status === 'approved' && r.subscriptionPro
    ).length;
  
    // Log for debugging
    console.log('Active Subscriptions Count:', activeSubscriptions);
    console.log('Premium Packages Count:', premiumPackages);
    console.log('Restaurants:', restaurants.map(r => ({
      name: r.restaurantName,
      status: r.status,
      subscriptionPro: r.subscriptionPro,
      subscriptionAmount: r.subscriptionAmount
    })));
    
    return {
      totalRevenue,
      monthlyGrowth: Number(monthlyGrowth.toFixed(1)),
      projectedIncome: Math.round(projectedIncome),
      activeSubscriptions,
      premiumPackages
    };
  }

  export const uploadImage = catchAsync(async (req, res, next) => {
    if (!req.file) {
      console.error('⚠️ No image uploaded:', req.body, req.files);
      return next(new AppError('Please upload an image', 400));
    }
  
    console.log(`✅ Received file: ${req.file.originalname}, Type: ${req.file.mimetype}`);
  
    try {
      // Upload to Cloudinary
      const cloudinaryResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'uploads', transformation: [{ width: 800, crop: 'limit' }] },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
  
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        bufferStream.pipe(uploadStream);
      });
  
      res.status(200).json({
        status: 'success',
        message: 'Image uploaded successfully',
        imageUrl: cloudinaryResponse.secure_url
      });
    } catch (error) {
      console.error('❌ Upload Error:', error);
      return next(new AppError('Image upload failed', 500));
    }
  });

function getRecentTransactions(restaurants) {
  return restaurants
    .sort((a, b) => new Date(b.lastLogin || b.createdAt) - new Date(a.lastLogin || a.createdAt))
    .slice(0, 4) // Get only 4 most recent transactions
    .map(restaurant => ({
      id: restaurant._id,
      date: restaurant.lastLogin || restaurant.createdAt,
      restaurant: restaurant.restaurantName,
      type: restaurant.subscriptionPro ? 'premium_package' : 'subscription',
      amount: restaurant.subscriptionAmount || (restaurant.subscriptionPro ? 16000 : 0),
      status: restaurant.subscriptionPro ? 'completed' : 'pending',
      packageType: restaurant.subscriptionPro ? 'premium' : 'basic'
    }));
}

export default incomeController;
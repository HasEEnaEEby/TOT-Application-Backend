// src/services/restaurantAnalyticsService.js

import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import { catchAsync } from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

/**
 * Calculate restaurant analytics data 
 * @param {string} restaurantId - The ID of the restaurant
 * @param {string} period - The period to calculate (day, week, month, year)
 * @returns {Object} Analytics data
 */
const calculateRestaurantAnalytics = catchAsync(async (restaurantId, period = 'month') => {
  logger.info('Calculating restaurant analytics', { restaurantId, period });

  // Current date
  const now = new Date();
  let startDate;
  
  // Calculate the start date based on the period
  switch (period) {
    case 'day':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  // Calculate the previous period start date for comparison
  let prevPeriodStartDate;
  let prevPeriodEndDate;
  
  switch (period) {
    case 'day':
      prevPeriodStartDate = new Date(startDate);
      prevPeriodStartDate.setDate(prevPeriodStartDate.getDate() - 1);
      prevPeriodEndDate = new Date(startDate);
      break;
    case 'week':
      prevPeriodStartDate = new Date(startDate);
      prevPeriodStartDate.setDate(prevPeriodStartDate.getDate() - 7);
      prevPeriodEndDate = new Date(startDate);
      break;
    case 'month':
      prevPeriodStartDate = new Date(startDate);
      prevPeriodStartDate.setMonth(prevPeriodStartDate.getMonth() - 1);
      prevPeriodEndDate = new Date(startDate);
      break;
    case 'year':
      prevPeriodStartDate = new Date(startDate);
      prevPeriodStartDate.setFullYear(prevPeriodStartDate.getFullYear() - 1);
      prevPeriodEndDate = new Date(startDate);
      break;
  }
  
  // Log date ranges for debugging
  logger.info('Analytics date ranges', {
    period,
    currentPeriod: {
      start: startDate,
      end: now
    },
    previousPeriod: {
      start: prevPeriodStartDate,
      end: prevPeriodEndDate
    }
  });

  // Fetch current period orders
  const currentPeriodOrders = await Order.find({
    restaurant: restaurantId,
    createdAt: { $gte: startDate, $lte: now }
  }).populate('items.item');
  
  // Fetch previous period orders
  const prevPeriodOrders = await Order.find({
    restaurant: restaurantId,
    createdAt: { $gte: prevPeriodStartDate, $lte: prevPeriodEndDate }
  });
  
  // Fetch menu items
  const menuItems = await MenuItem.find({ restaurant: restaurantId });
  
  logger.info('Fetched data for analytics', {
    currentPeriodOrderCount: currentPeriodOrders.length,
    prevPeriodOrderCount: prevPeriodOrders.length,
    menuItemCount: menuItems.length
  });

  // Calculate total revenue
  const totalRevenue = currentPeriodOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const prevTotalRevenue = prevPeriodOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const revenueGrowth = prevTotalRevenue ? 
    Math.round(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100) : 0;
  
  // Calculate total orders
  const totalOrders = currentPeriodOrders.length;
  const prevTotalOrders = prevPeriodOrders.length;
  const ordersGrowth = prevTotalOrders ? 
    Math.round(((totalOrders - prevTotalOrders) / prevTotalOrders) * 100) : 0;
  
  // Calculate unique customers
  const customerIds = currentPeriodOrders.map(order => order.customer ? order.customer.toString() : null).filter(Boolean);
  const prevCustomerIds = prevPeriodOrders.map(order => order.customer ? order.customer.toString() : null).filter(Boolean);
  const totalCustomers = new Set(customerIds).size;
  const prevTotalCustomers = new Set(prevCustomerIds).size;
  const customersGrowth = prevTotalCustomers ? 
    Math.round(((totalCustomers - prevTotalCustomers) / prevTotalCustomers) * 100) : 0;
  
  // Calculate average order value
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
  const prevAvgOrderValue = prevTotalOrders ? Math.round(prevTotalRevenue / prevTotalOrders) : 0;
  const avgOrderGrowth = prevAvgOrderValue ? 
    Math.round(((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100) : 0;
  
  // Calculate popular items
  const itemCounts = {};
  
  // Count occurrences of each menu item in orders
  currentPeriodOrders.forEach(order => {
    if (!order.items || !Array.isArray(order.items)) return;

    order.items.forEach(item => {
      let itemId = null;
      
      // Extract item ID safely
      if (typeof item === 'string') {
        itemId = item;
      } else if (item._id) {
        itemId = item._id.toString();
      } else if (item.item) {
        if (typeof item.item === 'string') {
          itemId = item.item;
        } else if (item.item._id) {
          itemId = item.item._id.toString();
        }
      }
      
      if (!itemId) return;
      
      if (!itemCounts[itemId]) {
        itemCounts[itemId] = { count: 0, revenue: 0 };
      }
      
      const quantity = item.quantity || 1;
      itemCounts[itemId].count += quantity;
      
      // Add revenue from this item
      const menuItem = menuItems.find(mi => mi._id.toString() === itemId);
      if (menuItem) {
        itemCounts[itemId].revenue += menuItem.price * quantity;
      }
    });
  });
  
  // Convert to array and sort by count
  const popularItems = Object.entries(itemCounts)
    .map(([itemId, data]) => {
      const menuItem = menuItems.find(item => item._id.toString() === itemId);
      return {
        name: menuItem ? menuItem.name : 'Unknown Item',
        count: data.count,
        revenue: data.revenue
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  // Generate recent activity
  const recentActivity = currentPeriodOrders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map(order => {
      const orderTime = new Date(order.createdAt);
      const timeDiff = Math.floor((now.getTime() - orderTime.getTime()) / 1000 / 60); // in minutes
      
      let timeString;
      if (timeDiff < 60) {
        timeString = `${timeDiff} minute${timeDiff !== 1 ? 's' : ''} ago`;
      } else if (timeDiff < 24 * 60) {
        const hours = Math.floor(timeDiff / 60);
        timeString = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(timeDiff / (24 * 60));
        timeString = `${days} day${days !== 1 ? 's' : ''} ago`;
      }
      
      return {
        action: `New order #${order._id.toString().slice(-6)} received - ₹${order.totalAmount}`,
        time: timeString
      };
    });
  
  // Generate monthly revenue data for the chart (last 6 months)
  const monthlyRevenue = [];
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  for (let i = 5; i >= 0; i--) {
    const month = (currentMonth - i + 12) % 12;
    const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;
    
    const monthStartDate = new Date(year, month, 1);
    const monthEndDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    const monthOrders = await Order.find({
      restaurant: restaurantId,
      createdAt: { $gte: monthStartDate, $lte: monthEndDate }
    });
    
    const monthRevenue = monthOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    monthlyRevenue.push({
      name: `${monthNames[month]}`,
      revenue: monthRevenue
    });
  }
  
  const analyticsData = {
    totalRevenue,
    totalOrders,
    totalCustomers,
    avgOrderValue,
    revenueGrowth,
    ordersGrowth,
    customersGrowth,
    avgOrderGrowth,
    popularItems,
    recentActivity,
    monthlyRevenue
  };

  logger.info('Analytics calculation complete', {
    restaurantId,
    period,
    totalRevenue,
    totalOrders,
    totalCustomers
  });
  
  return analyticsData;
});

/**
 * Generate a dashboard summary report
 * @param {string} restaurantId - The ID of the restaurant
 * @returns {Object} Dashboard summary
 */
const generateDashboardSummary = catchAsync(async (restaurantId) => {
  logger.info('Generating dashboard summary', { restaurantId });

  // Get analytics for different time periods
  const dailyAnalytics = await calculateRestaurantAnalytics(restaurantId, 'day');
  const weeklyAnalytics = await calculateRestaurantAnalytics(restaurantId, 'week');
  const monthlyAnalytics = await calculateRestaurantAnalytics(restaurantId, 'month');
  
  // Get total menu items count
  const totalMenuItems = await MenuItem.countDocuments({ restaurant: restaurantId });
  
  // Get available vs unavailable menu items
  const availableMenuItems = await MenuItem.countDocuments({ 
    restaurant: restaurantId,
    isAvailable: true
  });
  
  const dashboardSummary = {
    daily: {
      revenue: dailyAnalytics.totalRevenue,
      orders: dailyAnalytics.totalOrders,
      customers: dailyAnalytics.totalCustomers
    },
    weekly: {
      revenue: weeklyAnalytics.totalRevenue,
      orders: weeklyAnalytics.totalOrders,
      customers: weeklyAnalytics.totalCustomers
    },
    monthly: {
      revenue: monthlyAnalytics.totalRevenue,
      orders: monthlyAnalytics.totalOrders,
      customers: monthlyAnalytics.totalCustomers
    },
    menuStats: {
      total: totalMenuItems,
      available: availableMenuItems,
      unavailable: totalMenuItems - availableMenuItems
    },
    mostPopularItems: monthlyAnalytics.popularItems
  };

  logger.info('Dashboard summary generated', {
    restaurantId,
    daily: dashboardSummary.daily,
    weekly: dashboardSummary.weekly
  });
  
  return dashboardSummary;
});

export default {
  calculateRestaurantAnalytics,
  generateDashboardSummary
};
import { deleteFromCloudinary, uploadToCloudinary } from '../config/cloudinary.js';
import { ROLES } from '../constants/roles.js';
import { parseAllergens, parseNutritionalInfo } from '../helpers/menuehelper.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import RestaurantManagement from '../models/RestaurantManagement.js';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export const restaurantController = {
  // Profile Management
  getProfile: catchAsync(async (req, res) => {
    logger.info('Fetching restaurant profile', {
      userId: req.user._id,
      requestId: req.id
    });

    const restaurant = await User.findOne({
      _id: req.user._id,
      role: ROLES.RESTAURANT
    }).select('-password -adminCode');

    if (!restaurant) {
      throw new AppError('Restaurant profile not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { restaurant }
    });
  }),

  updateProfile: catchAsync(async (req, res) => {
    // Define all allowed fields to update
    const allowedUpdates = [
      'restaurantName',
      'location',
      'contactNumber',
      'quote',
      'hours',  // Make sure 'hours' is included here
      'description',
      'cuisine'
    ];
  
    // Log the incoming request body for debugging
    console.log('Updating profile with data:', req.body);
  
    // Filter the request body to only include allowed fields
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});
  
    // Log what we're going to update in the database
    console.log('Filtered updates to apply:', updates);
  
    // Update the user document with the filtered updates
    const restaurant = await User.findOneAndUpdate(
      { _id: req.user._id, role: ROLES.RESTAURANT },
      updates,
      { new: true, runValidators: true }
    ).select('-password -adminCode');
  
    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }
  
    // Log what was updated in the database
    console.log('Updated restaurant document:', restaurant);
  
    // Also log operating hours activity if hours were updated
    if (req.body.hours) {
      try {
        // Find the restaurant management document
        const management = await RestaurantManagement.findOne({ restaurant: req.user._id });
        
        if (management) {
          // Log the hours update activity
          await management.logActivity('OPERATING_HOURS_UPDATED', {
            oldHours: management.hours || "Not set",
            newHours: req.body.hours,
            updatedBy: req.user._id
          });
        }
      } catch (activityError) {
        // Non-critical error, just log it
        console.error('Error logging hours update activity:', activityError);
      }
    }
  
    res.status(200).json({
      status: 'success',
      data: { restaurant }
    });
  }),

  getAllRestaurants: catchAsync(async (req, res) => {
      logger.info('Fetching all restaurants for customer dashboard', {
        requestId: req.id
      });
  
      // Fetch all approved restaurants
      const restaurants = await User.find({ role: ROLES.RESTAURANT, status: 'approved' })
      .select('restaurantName location contactNumber quote status subscriptionPro subscriptionAmount createdAt updatedAt image')
        .lean();
  
      if (!restaurants.length) {
        throw new AppError('No restaurants available at the moment', 404);
      }
  
      // Fetch restaurant ratings from RestaurantManagement model
      const enrichedRestaurants = await Promise.all(
        restaurants.map(async (restaurant) => {
          const managementData = await RestaurantManagement.findOne({ restaurant: restaurant._id })
            .select('rating')
            .lean();
  
          return {
            _id: restaurant._id,
            restaurantName: restaurant.restaurantName,
            location: restaurant.location,
            contactNumber: restaurant.contactNumber,
            quote: restaurant.quote,
            image: restaurant.image || null,
            rating: managementData?.rating?.average || 0, 
            createdAt: restaurant.createdAt,
            updatedAt: restaurant.updatedAt,
          };
        })
      );
  
      res.status(200).json({
        status: 'success',
        results: enrichedRestaurants.length,
        data: enrichedRestaurants
      });
    }),

  // Menu Management
  getMenuItems: catchAsync(async (req, res) => {
    const menuItems = await MenuItem.find({ 
      restaurant: req.user._id 
    }).sort({ category: 1, name: 1 });

    res.status(200).json({
      status: 'success',
      results: menuItems.length,
      data: { menuItems }
    });
  }),

  getMenuItem: catchAsync(async (req, res) => {
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurant: req.user._id
    });

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { menuItem }
    });
  }),

  createMenuItem: catchAsync(async (req, res) => {
    let imageUrl = null;
    if (req.file) {
      const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const result = await uploadToCloudinary(fileStr, {
        folder: `restaurants/${req.user._id}/menu-items`
      });
      imageUrl = result.url;
    }

    const menuItemData = {
      ...req.body,
      allergens: parseAllergens(req.body.allergens),
      nutritionalInfo: parseNutritionalInfo(req.body.nutritionalInfo),
      image: imageUrl,
      restaurant: req.user._id,
      isVegetarian: req.body.isVegetarian === 'true',
      isAvailable: req.body.isAvailable === 'true',
      price: parseFloat(req.body.price),
      preparationTime: parseInt(req.body.preparationTime, 10)
    };

    const menuItem = await MenuItem.create(menuItemData);

    await RestaurantManagement.findOneAndUpdate(
      { restaurant: req.user._id },
      {
        $push: {
          activityLog: {
            action: 'MENU_ITEM_CREATED',
            timestamp: new Date(),
            details: { menuItemId: menuItem._id }
          }
        }
      }
    );

    res.status(201).json({
      status: 'success',
      data: { menuItem }
    });
  }),

  updateMenuItem: catchAsync(async (req, res) => {
    const updates = {
      ...req.body,
      allergens: parseAllergens(req.body.allergens),
      nutritionalInfo: parseNutritionalInfo(req.body.nutritionalInfo),
      isVegetarian: req.body.isVegetarian === 'true',
      isAvailable: req.body.isAvailable === 'true',
      price: parseFloat(req.body.price),
      preparationTime: parseInt(req.body.preparationTime, 10)
    };

    if (req.file) {
      const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const result = await uploadToCloudinary(fileStr, {
        folder: `restaurants/${req.user._id}/menu-items`
      });
      updates.image = result.url;

      const existingMenuItem = await MenuItem.findById(req.params.id);
      if (existingMenuItem?.image) {
        const oldPublicId = existingMenuItem.image.split('/').pop().split('.')[0];
        await deleteFromCloudinary(oldPublicId);
      }
    }

    const menuItem = await MenuItem.findOneAndUpdate(
      {
        _id: req.params.id,
        restaurant: req.user._id
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    await RestaurantManagement.findOneAndUpdate(
      { restaurant: req.user._id },
      {
        $push: {
          activityLog: {
            action: 'MENU_ITEM_UPDATED',
            timestamp: new Date(),
            details: { menuItemId: menuItem._id }
          }
        }
      }
    );

    res.status(200).json({
      status: 'success',
      data: { menuItem }
    });
  }),

  deleteMenuItem: catchAsync(async (req, res) => {
    const menuItem = await MenuItem.findOneAndDelete({
      _id: req.params.id,
      restaurant: req.user._id
    });
  
    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }
  
    // Improved public ID extraction
    if (menuItem.image) {
      try {
        // Extract public ID from Cloudinary URL
        const urlParts = menuItem.image.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
  
        // Full path for Cloudinary public ID
        const fullPublicId = urlParts.slice(-3).join('/').split('.')[0];
  
        logger.info('Attempting to delete image', {
          image: menuItem.image,
          publicId,
          fullPublicId
        });
  
        // Try deleting with both extracted public IDs
        try {
          await deleteFromCloudinary(fullPublicId);
        } catch (fullIdError) {
          logger.warn('Full public ID deletion failed, trying alternative', {
            error: fullIdError.message
          });
          
          try {
            await deleteFromCloudinary(publicId);
          } catch (shortIdError) {
            logger.error('Image deletion failed', {
              fullIdError: fullIdError.message,
              shortIdError: shortIdError.message
            });
            // Don't throw error to allow menu item deletion to proceed
          }
        }
      } catch (error) {
        logger.error('Error processing image deletion', {
          error: error.message,
          image: menuItem.image
        });
        // Log the error but don't block the deletion process
      }
    }
  
    await RestaurantManagement.findOneAndUpdate(
      { restaurant: req.user._id },
      {
        $push: {
          activityLog: {
            action: 'MENU_ITEM_DELETED',
            timestamp: new Date(),
            details: { menuItemId: menuItem._id }
          }
        }
      }
    );
  
    res.status(204).json({
      status: 'success',
      data: null
    });
  }),

  getMenuItemsByCategory: catchAsync(async (req, res) => {
    const { category } = req.params;

    const menuItems = await MenuItem.find({
      restaurant: req.user._id,
      category
    }).sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: menuItems.length,
      data: { menuItems }
    });
  }),

  getMenuItemsByRestaurant: catchAsync(async (req, res) => {
    const { restaurantId } = req.params;
    
    logger.info('Fetching menu items for restaurant', {
      requestedRestaurantId: restaurantId
    });
  
    // Find menu items for the specified restaurant
    const menuItems = await MenuItem.find({ 
      restaurant: restaurantId,
      isAvailable: true // Only return available items by default
    }).sort({ category: 1, name: 1 });
  
    res.status(200).json({
      status: 'success',
      results: menuItems.length,
      data: menuItems
    });
  }),

  toggleMenuItemAvailability: catchAsync(async (req, res) => {
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurant: req.user._id
    });

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    await RestaurantManagement.findOneAndUpdate(
      { restaurant: req.user._id },
      {
        $push: {
          activityLog: {
            action: `MENU_ITEM_${menuItem.isAvailable ? 'ENABLED' : 'DISABLED'}`,
            timestamp: new Date(),
            details: { menuItemId: menuItem._id }
          }
        }
      }
    );

    res.status(200).json({
      status: 'success',
      data: { menuItem }
    });
  }),

  // Image Management
  uploadImage: catchAsync(async (req, res) => {
    if (!req.file) {
      throw new AppError('Please provide an image', 400);
    }
  
    const imageType = req.body.type;
    if (!['profile', 'cover'].includes(imageType)) {
      throw new AppError('Invalid image type. Must be either profile or cover', 400);
    }
  
    // Log for debugging
    logger.info('Processing image upload', {
      type: imageType,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
  
    const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await uploadToCloudinary(fileStr, {
      folder: `restaurants/${req.user._id}/${imageType}`
    });
  
    logger.info('Cloudinary upload result', {
      publicId: result.publicId,
      url: result.url
    });
  
    // Determine which field to update based on the type
    const fieldToUpdate = imageType === 'profile' ? 'image' : 'coverImage';
  
    // Update the user document with the image URL directly
    const restaurant = await User.findByIdAndUpdate(
      req.user._id,
      {
        [fieldToUpdate]: result.url
      },
      { new: true }
    ).select('-password -adminCode');
  
    // Log the updated restaurant for debugging
    logger.info('Updated restaurant document', {
      id: restaurant._id,
      imageField: fieldToUpdate,
      imageUrl: restaurant[fieldToUpdate]
    });
  
    await RestaurantManagement.findOneAndUpdate(
      { restaurant: req.user._id },
      {
        $push: {
          activityLog: {
            action: `${imageType.toUpperCase()}_IMAGE_UPDATED`,
            timestamp: new Date()
          }
        }
      }
    );
  
    res.status(200).json({
      status: 'success',
      data: { restaurant }
    });
  }),


  deleteImage: catchAsync(async (req, res) => {
    const { type } = req.params;
    if (!['profile', 'cover'].includes(type)) {
      throw new AppError('Invalid image type', 400);
    }

    const imageField = type === 'profile' ? 'restaurantImage' : 'coverImage';
    const user = await User.findById(req.user._id);

    if (!user[imageField]?.publicId) {
      throw new AppError('No image found', 404);
    }

    await deleteFromCloudinary(user[imageField].publicId);
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { [imageField]: 1 }
    });

    await RestaurantManagement.findOneAndUpdate(
      { restaurant: req.user._id },
      {
        $push: {
          activityLog: {
            action: `${type.toUpperCase()}_IMAGE_DELETED`,
            timestamp: new Date()
          }
        }
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Image deleted successfully'
    });
  }),
// Operating Hours Management
getOperatingHours: catchAsync(async (req, res) => {
  const restaurant = await RestaurantManagement.findOne({ 
    restaurant: req.user._id 
  }).select('operatingHours');

  if (!restaurant) {
    throw new AppError('Restaurant operation hours not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: { operatingHours: restaurant.operatingHours }
  });
}),

updateOperatingHours: catchAsync(async (req, res) => {
  const management = await RestaurantManagement.findOneAndUpdate(
    { restaurant: req.user._id },
    { operatingHours: req.body.operatingHours },
    { new: true, runValidators: true }
  ).select('operatingHours');

  if (!management) {
    throw new AppError('Restaurant not found', 404);
  }

  await management.logActivity('OPERATING_HOURS_UPDATED', {
    updatedBy: req.user._id,
    newHours: req.body.operatingHours
  });

  res.status(200).json({
    status: 'success',
    data: { operatingHours: management.operatingHours }
  });
}),

// Order Management
getCurrentOrders: catchAsync(async (req, res) => {
  const orders = await Order.find({
    restaurant: req.user._id,
    status: { 
      $in: ['pending', 'confirmed', 'preparing', 'ready'] 
    }
  })
  .sort('-createdAt')
  .populate('customerId', 'name email phone');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { orders }
  });
}),

updateOrderStatus: catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  // Validate status
  const validStatuses = ['confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Invalid order status', 400);
  }

  // Find and update order
  const order = await Order.findOneAndUpdate(
    { 
      _id: orderId,
      restaurant: req.user._id
    },
    { 
      status,
      updatedAt: new Date()
    },
    { new: true }
  ).populate('customerId', 'name email phone');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Log status change
  await RestaurantManagement.findOneAndUpdate(
    { restaurant: req.user._id },
    {
      $push: {
        activityLog: {
          action: 'ORDER_STATUS_UPDATED',
          timestamp: new Date(),
          details: {
            orderId: order._id,
            oldStatus: order.status,
            newStatus: status,
            updatedBy: req.user._id
          }
        }
      }
    }
  );

  res.status(200).json({
    status: 'success',
    data: { order }
  });
}),

updateSubscription: catchAsync(async (req, res) => {
  const restaurantId = req.user._id;

  // Find or create the RestaurantManagement document
  let restaurantManagement = await RestaurantManagement.findOne({ restaurant: restaurantId });

  // If no management document exists, create one
  if (!restaurantManagement) {
    restaurantManagement = new RestaurantManagement({
      restaurant: restaurantId
    });
  }

  // Clear existing IP addresses to prevent validation issues
  restaurantManagement.status.ipAddress = null;
  restaurantManagement.activityLog = [];

  // Enable pro features
  restaurantManagement.features = {
    menuCustomization: true,
    analyticsAccess: true,
    promotionalTools: true,
    tableReservation: true,
    multiLocationSupport: true
  };

  // Add subscription using the method with default safe values
  restaurantManagement.addSubscription(
    16000,  // amount
    'pro',  // plan
    30      // duration in days
  );

  // Save the restaurant management document
  await restaurantManagement.save();

  // Update user document
  const restaurant = await User.findByIdAndUpdate(
    restaurantId,
    {
      subscriptionPro: true,
      subscriptionAmount: 16000,
      subscriptionStartDate: new Date(),
      lastLogin: new Date()
    },
    { new: true, runValidators: true }
  ).select('-password -adminCode');

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'Subscription successful! Welcome to Pro Plan.',
    data: { 
      restaurant,
      subscription: restaurantManagement.subscription 
    }
  });
}),


};




export default restaurantController;
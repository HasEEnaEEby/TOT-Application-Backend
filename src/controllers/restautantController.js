// src/controllers/restaurantController.js
import { deleteFromCloudinary, uploadToCloudinary } from '../config/cloudinary.js';
import { ROLES } from '../constants/roles.js';
import MenuItem from '../models/MenuItem.js';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export const restaurantController = {
  // Restaurant Profile Methods
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
    logger.info('Updating restaurant profile', {
      userId: req.user._id,
      requestId: req.id
    });

    const allowedUpdates = [
      'restaurantName',
      'location',
      'contactNumber',
      'quote',
      'businessHours',
      'description',
      'cuisine'
    ];

    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    const restaurant = await User.findOneAndUpdate(
      { _id: req.user._id, role: ROLES.RESTAURANT },
      updates,
      { new: true, runValidators: true }
    ).select('-password -adminCode');

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { restaurant }
    });
  }),

  uploadImage: catchAsync(async (req, res) => {
    if (!req.file) {
      throw new AppError('Please provide an image', 400);
    }

    const imageType = req.body.type;
    if (!['profile', 'cover'].includes(imageType)) {
      throw new AppError('Invalid image type. Must be either profile or cover', 400);
    }

    // Convert buffer to base64
    const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await uploadToCloudinary(fileStr, {
      folder: `restaurants/${req.user._id}/${imageType}`
    });

    // Delete old image if exists
    const imageField = imageType === 'profile' ? 'restaurantImage' : 'coverImage';
    if (req.user[imageField]?.publicId) {
      await deleteFromCloudinary(req.user[imageField].publicId);
    }

    // Update user document
    const restaurant = await User.findByIdAndUpdate(
      req.user._id,
      {
        [imageField]: {
          publicId: result.publicId,
          url: result.url
        }
      },
      { new: true }
    ).select('-password -adminCode');

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

    res.status(200).json({
      status: 'success',
      message: 'Image deleted successfully'
    });
  }),

  // Menu Management Methods
  createMenuItem: catchAsync(async (req, res) => {
    logger.info('Creating new menu item', {
      userId: req.user._id,
      requestId: req.id
    });

    const restaurant = await User.findOne({ 
      _id: req.user._id, 
      role: ROLES.RESTAURANT,
      status: 'approved' 
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found or not approved', 404);
    }

    const menuItem = await MenuItem.create({
      ...req.body,
      restaurant: restaurant._id,
    });

    res.status(201).json({
      status: 'success',
      data: { menuItem }
    });
  }),

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

  updateMenuItem: catchAsync(async (req, res) => {
    const allowedUpdates = [
      'name',
      'description',
      'price',
      'category',
      'isAvailable',
      'isVegetarian',
      'spicyLevel',
      'allergens',
      'preparationTime',
      'nutritionalInfo'
    ];

    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

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

    res.status(200).json({
      status: 'success',
      data: { menuItem }
    });
  })
};

export default restaurantController;
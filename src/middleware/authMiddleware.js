// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { ROLES } from '../constants/roles.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    } 
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      logger.warn('Authentication failed: No token provided');
      return next(new AppError('Please log in to access this resource', 401));
    }

    try {

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const currentUser = await User.findById(decoded.id)
        .select('-password -verificationToken -verificationExpires');
      
      if (!currentUser) {
        logger.warn('Authentication failed: User not found', { userId: decoded.id });
        return next(new AppError('The user belonging to this token no longer exists', 401));
      }

      if (!currentUser.isEmailVerified) {
        logger.warn('Authentication failed: Email not verified', { userId: currentUser._id });
        return next(new AppError('Please verify your email to access this resource', 403));
      }

      if (currentUser.passwordChangedAt && 
          decoded.iat < currentUser.passwordChangedAt.getTime() / 1000) {
        logger.warn('Authentication failed: Password changed', { userId: currentUser._id });
        return next(new AppError('User recently changed password. Please log in again', 401));
      }

      req.user = currentUser;
      logger.info('Authentication successful', { 
        userId: currentUser._id,
        role: currentUser.role,
        path: req.originalUrl
      });
      next();
    } catch (err) {
      logger.error('Token verification failed:', {
        error: err.message,
        token: token.substring(0, 10) + '...'
      });
      return next(new AppError('Invalid token. Please log in again', 401));
    }
  } catch (error) {
    logger.error('Authentication middleware error:', {
      error: error.message,
      stack: error.stack
    });
    next(new AppError('Authentication failed', 500));
  }
};


export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};


export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization failed: Invalid role', {
        userId: req.user._id,
        requiredRoles: roles,
        userRole: req.user.role
      });
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};


export const admin = async (req, res, next) => {
  if (req.user.role !== ROLES.ADMIN) {
    logger.warn('Admin access denied', { userId: req.user._id });
    return next(new AppError('Access denied. Admin privileges required', 403));
  }
  
  logger.info('Admin access granted', { 
    userId: req.user._id,
    path: req.originalUrl 
  });
  next();
};


export const restaurant = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.RESTAURANT) {
      logger.warn('Restaurant access denied: Invalid role', { userId: req.user._id });
      return next(new AppError('Access denied. Restaurant privileges required', 403));
    }

    const user = await User.findById(req.user._id)
      .select('status isEmailVerified');

    if (!user.isEmailVerified) {
      logger.warn('Restaurant access denied: Email not verified', { userId: req.user._id });
      return next(new AppError('Please verify your email first', 403));
    }

    if (user.status !== 'approved') {
      logger.warn('Restaurant access denied: Not approved', {
        userId: req.user._id,
        status: user.status
      });
      return next(new AppError(
        user.status === 'pending' 
          ? 'Your restaurant account is pending approval'
          : 'Your restaurant account has been rejected',
        403
      ));
    }

    logger.info('Restaurant access granted', {
      userId: req.user._id,
      path: req.originalUrl
    });
    next();
  } catch (error) {
    logger.error('Restaurant middleware error:', {
      error: error.message,
      userId: req.user._id
    });
    next(new AppError('Authorization check failed', 500));
  }
};


export const checkOwnership = (Model, paramField = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramField];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        logger.warn('Resource not found', { resourceId, model: Model.modelName });
        return next(new AppError('Resource not found', 404));
      }

      if (req.user.role !== ROLES.ADMIN && 
          resource.user.toString() !== req.user._id.toString()) {
        logger.warn('Ownership check failed', {
          userId: req.user._id,
          resourceId,
          model: Model.modelName
        });
        return next(new AppError('You do not have permission to access this resource', 403));
      }

      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Ownership check error:', {
        error: error.message,
        userId: req.user._id
      });
      next(new AppError('Authorization check failed', 500));
    }
  };
};

export default {
  protect,
  optionalAuth,
  restrictTo,
  admin,
  restaurant,
  checkOwnership
};
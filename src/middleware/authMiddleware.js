import jwt from 'jsonwebtoken';
import { ROLES } from '../constants/roles.js';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Main authentication middleware
 */
export const protect = catchAsync(async (req, res, next) => {
  // Get token from Authorization header or cookies
  let token = req.cookies?.token;
  
  const authHeader = req.headers.authorization;
  if (!token && authHeader?.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    logger.warn('Authentication failed: No token provided', { requestId: req.id });
    throw new AppError('Please log in to access this resource', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    logger.error('Token verification failed:', {
      error: err.message,
      token: token.substring(0, 10) + '...',
      requestId: req.id
    });
    throw new AppError(
      err.name === 'TokenExpiredError' 
        ? 'Your session has expired. Please log in again'
        : 'Invalid token. Please log in again', 
      401
    );
  }

  const currentUser = await User.findById(decoded.id)
    .select('-password -verificationToken -verificationExpires');
  
  if (!currentUser) {
    logger.warn('Authentication failed: User not found', { 
      userId: decoded.id,
      requestId: req.id 
    });
    throw new AppError('The user belonging to this token no longer exists', 401);
  }

  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !currentUser.isEmailVerified) {
    logger.warn('Authentication failed: Email not verified', { 
      userId: currentUser._id,
      requestId: req.id 
    });
    throw new AppError('Please verify your email to access this resource', 403);
  }

  if (currentUser.passwordChangedAt && 
      decoded.iat < currentUser.passwordChangedAt.getTime() / 1000) {
    logger.warn('Authentication failed: Password changed', { 
      userId: currentUser._id,
      requestId: req.id 
    });
    throw new AppError('Password was recently changed. Please log in again', 401);
  }

  req.user = currentUser;
  logger.info('Authentication successful', { 
    userId: currentUser._id,
    role: currentUser.role,
    path: req.originalUrl,
    requestId: req.id
  });
  next();
});

/**
 * Admin registration protection middleware
 */
export const adminRegisterProtect = catchAsync(async (req, res, next) => {
  // Check if admin registration is enabled
  if (process.env.ALLOW_ADMIN_REGISTRATION !== 'true') {
    logger.warn('Admin registration attempt blocked: Registration disabled', { 
      requestId: req.id 
    });
    throw new AppError('Admin registration is not allowed', 403);
  }

  // Check if an admin already exists (optional - remove if multiple admins are allowed)
  const adminExists = await User.findOne({ role: ROLES.ADMIN });
  if (adminExists) {
    logger.warn('Admin registration attempt blocked: Admin already exists', { 
      requestId: req.id 
    });
    throw new AppError('Admin already exists', 403);
  }

  next();
});

/**
 * Admin authentication middleware
 */
export const adminProtect = catchAsync(async (req, res, next) => {
  await protect(req, res, () => {
    if (req.user.role !== ROLES.ADMIN) {
      logger.warn('Admin authentication failed: Invalid role', { 
        userId: req.user._id,
        role: req.user.role,
        requestId: req.id 
      });
      throw new AppError('Admin access required', 403);
    }
    next();
  });
});

/**
 * Optional authentication middleware
 */
export const optionalAuth = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        logger.info('Optional auth successful', { 
          userId: user._id,
          requestId: req.id 
        });
      }
    } catch (error) {
      logger.info('Optional auth token invalid', { requestId: req.id });
    }
  }
  next();
});

/**
 * Role-based authorization middleware
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn('Authorization failed: Invalid role', {
        userId: req.user._id,
        requiredRoles: roles,
        userRole: req.user.role,
        requestId: req.id
      });
      throw new AppError('You do not have permission to perform this action', 403);
    }
    next();
  };
};

/**
 * Admin authorization middleware
 */
export const admin = catchAsync(async (req, res, next) => {
  if (req.user.role !== ROLES.ADMIN) {
    logger.warn('Admin access denied', { 
      userId: req.user._id,
      requestId: req.id 
    });
    throw new AppError('Access denied. Admin privileges required', 403);
  }
  
  logger.info('Admin access granted', { 
    userId: req.user._id,
    path: req.originalUrl,
    requestId: req.id
  });
  next();
});

/**
 * Restaurant authorization middleware
 */
export const restaurant = catchAsync(async (req, res, next) => {
  if (req.user.role !== ROLES.RESTAURANT) {
    logger.warn('Restaurant access denied: Invalid role', { 
      userId: req.user._id,
      requestId: req.id 
    });
    throw new AppError('Access denied. Restaurant privileges required', 403);
  }

  const user = await User.findById(req.user._id)
    .select('status isEmailVerified');

  if (!user.isEmailVerified) {
    logger.warn('Restaurant access denied: Email not verified', { 
      userId: req.user._id,
      requestId: req.id 
    });
    throw new AppError('Please verify your email first', 403);
  }

  if (user.status !== 'approved') {
    logger.warn('Restaurant access denied: Not approved', {
      userId: req.user._id,
      status: user.status,
      requestId: req.id
    });
    throw new AppError(
      user.status === 'pending' 
        ? 'Your restaurant account is pending approval'
        : 'Your restaurant account has been rejected',
      403
    );
  }

  logger.info('Restaurant access granted', {
    userId: req.user._id,
    path: req.originalUrl,
    requestId: req.id
  });
  next();
});

/**
 * Resource ownership middleware factory
 */
export const checkOwnership = (Model, paramField = 'id') => {
  return catchAsync(async (req, res, next) => {
    const resourceId = req.params[paramField];
    const resource = await Model.findById(resourceId);

    if (!resource) {
      logger.warn('Resource not found', { 
        resourceId, 
        model: Model.modelName,
        requestId: req.id 
      });
      throw new AppError('Resource not found', 404);
    }

    if (req.user.role !== ROLES.ADMIN && 
        resource.user.toString() !== req.user._id.toString()) {
      logger.warn('Ownership check failed', {
        userId: req.user._id,
        resourceId,
        model: Model.modelName,
        requestId: req.id
      });
      throw new AppError('You do not have permission to access this resource', 403);
    }

    req.resource = resource;
    next();
  });
};

export default {
  protect,
  optionalAuth,
  restrictTo,
  admin,
  adminProtect,
  adminRegisterProtect,
  restaurant,
  checkOwnership
};
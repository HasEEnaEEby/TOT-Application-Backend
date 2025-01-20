import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        logger.error('Role middleware: No user found in request');
        return next(new AppError('Authentication required', 401));
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Access denied: Invalid role', {
          userId: req.user._id,
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
        return next(new AppError('Access denied: Insufficient privileges', 403));
      }

      logger.info('Role verification successful', {
        userId: req.user._id,
        role: req.user.role,
        path: req.originalUrl
      });
      
      next();
    } catch (error) {
      logger.error('Role middleware error:', {
        error: error.message,
        stack: error.stack
      });
      next(new AppError('Role verification failed', 500));
    }
  };
};

export default roleMiddleware;
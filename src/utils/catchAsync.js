// src/utils/catchAsync.js
import AppError from './AppError.js';
import logger from './logger.js';

export const catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      // Log the full error for server-side tracking
      logger.error('Operation error:', { 
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
      });

      // If it's already an AppError, pass it through
      if (error instanceof AppError) {
        return next(error);
      }

      // For other errors, create a new AppError
      const statusCode = error.status || error.statusCode || 500;
      const message = error.message || 'Internal Server Error';

      // Create a new AppError with additional context
      const appError = new AppError(message, statusCode);
      
      // Optionally add additional error details
      if (process.env.NODE_ENV === 'development') {
        appError.originalError = error;
      }

      next(appError);
    }
  };
};

export default catchAsync;
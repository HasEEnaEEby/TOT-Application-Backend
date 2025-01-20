import AppError from './AppError.js';
import logger from './logger.js';

export const catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logger.error('Operation error:', { 
        error: error.message,
        stack: error.stack
      });
      next(new AppError(error.message, error.statusCode || 500));
    }
  };
};
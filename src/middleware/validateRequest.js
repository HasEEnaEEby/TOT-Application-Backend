import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

export const validateRequest = (validations) => {
  return async (req, res, next) => {
    try {
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        throw new AppError(errorMessages[0], 400);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
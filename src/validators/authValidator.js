// src/validators/authValidator.js
import { body } from 'express-validator';
import { ROLES } from '../constants/roles.js';

export const registerValidator = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('username')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Username must be at least 2 characters long'),
  
  body('role')
    .isIn(Object.values(ROLES))
    .withMessage('Invalid role specified'),

    body('restaurantName')
    .if(body('role').equals('restaurant'))
    .notEmpty()
    .withMessage('Restaurant name is required for restaurant registration')
    .isLength({ min: 2 })
    .withMessage('Restaurant name must be at least 2 characters long'),

  body('location')
    .if(body('role').equals('restaurant'))
    .notEmpty()
    .withMessage('Location is required for restaurant registration'),

  body('contactNumber')
    .if(body('role').equals('restaurant'))
    .notEmpty()
    .matches(/^\+?[\d\s-]+$/)
    .withMessage('Please provide a valid contact number')
];

export const loginValidator = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('role')
    .isIn(Object.values(ROLES))
    .withMessage('Invalid role specified')
];

export const emailValidator = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

export const passwordResetValidator = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

export const profileUpdateValidator = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Username must be at least 2 characters long'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('currentPassword')
    .if(body('newPassword').exists())
    .notEmpty()
    .withMessage('Current password is required to set new password'),
  
  body('newPassword')
    .optional()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),

  // Restaurant profile fields
  body('restaurantName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Restaurant name cannot be empty'),

  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location cannot be empty'),

  body('contactNumber')
    .optional()
    .matches(/^\+?[\d\s-]+$/)
    .withMessage('Please provide a valid contact number')
];
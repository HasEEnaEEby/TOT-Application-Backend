// src/validators/taskValidator.js
import { body } from 'express-validator';

// Validation for creating a task
export const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ max: 200 }).withMessage('Task title cannot exceed 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Task description cannot exceed 500 characters'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  
  body('type')
    .optional()
    .isIn(['general', 'approval', 'subscription', 'finance'])
    .withMessage('Invalid task type'),
  
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'cancelled'])
    .withMessage('Invalid task status'),
  
  body('dueDate')
    .optional()
    .isISO8601().toDate().withMessage('Invalid due date')
];

// Validation for updating a task
export const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Task title cannot exceed 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Task description cannot exceed 500 characters'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  
  body('type')
    .optional()
    .isIn(['general', 'approval', 'subscription', 'finance'])
    .withMessage('Invalid task type'),
  
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'cancelled'])
    .withMessage('Invalid task status'),
  
  body('dueDate')
    .optional()
    .isISO8601().toDate().withMessage('Invalid due date')
];
import { body } from 'express-validator';

export const bulkActionValidator = [
  body('ids')
    .isArray()
    .withMessage('ids must be an array')
    .notEmpty()
    .withMessage('ids array cannot be empty'),
  body('ids.*')
    .isMongoId()
    .withMessage('Invalid restaurant ID format')
];
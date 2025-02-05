import { body } from 'express-validator';

export const bulkActionValidator = [
  body('ids')
    .isArray()
    .withMessage('ids must be an array')
    .notEmpty()
    .withMessage('ids array cannot be empty')
    .custom((value) => {
      if (!value.every((id) => typeof id === 'string' && id.length > 0)) {
        throw new Error('All ids must be non-empty strings');
      }
      return true;
    })
];

export const searchValidator = [
  body('searchTerm')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search term must be at least 1 character long'),
  
  body('location')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Location must be at least 1 character long')
];
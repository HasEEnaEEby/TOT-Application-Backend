import Joi from 'joi';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

const CATEGORIES = ['appetizer', 'main course', 'dessert', 'beverage', 'special'];
const SPICY_LEVELS = ['mild', 'medium', 'hot', 'extra hot'];
const ALLERGENS = ['nuts', 'dairy', 'gluten', 'soy', 'shellfish', 'eggs'];

const createMenuItemSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(100)
    .trim()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),

  description: Joi.string()
    .required()
    .min(10)
    .max(500)
    .trim()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 500 characters'
    }),

  price: Joi.number()
    .required()
    .min(0)
    .positive()
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price cannot be negative',
      'number.positive': 'Price must be a positive number'
    }),

  category: Joi.string()
    .required()
    .valid(...CATEGORIES)
    .messages({
      'any.only': 'Invalid category. Must be one of: ' + CATEGORIES.join(', ')
    }),

  isVegetarian: Joi.boolean()
    .default(false),

  spicyLevel: Joi.string()
    .valid(...SPICY_LEVELS)
    .optional()
    .messages({
      'any.only': 'Invalid spicy level. Must be one of: ' + SPICY_LEVELS.join(', ')
    }),

  preparationTime: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'Preparation time cannot be negative'
    }),

  allergens: Joi.array()
    .items(
      Joi.string()
        .valid(...ALLERGENS)
        .trim()
    )
    .optional()
    .max(5)
    .unique()
    .messages({
      'any.only': 'Invalid allergen. Must be one of: ' + ALLERGENS.join(', '),
      'array.max': 'Maximum of 5 allergens allowed',
      'array.unique': 'Duplicate allergens are not allowed'
    }),

  isAvailable: Joi.boolean()
    .default(true),

  nutritionalInfo: Joi.object({
    calories: Joi.number().min(0).optional(),
    protein: Joi.number().min(0).optional(),
    carbohydrates: Joi.number().min(0).optional(),
    fats: Joi.number().min(0).optional()
  }).optional()
});

const updateMenuItemSchema = createMenuItemSchema.fork(
  ['name', 'description', 'price', 'category', 'isVegetarian', 'isAvailable'],
  (schema) => schema.optional()
);

export const validateMenuItem = (req, res, next) => {
  try {
    logger.info('Incoming Request Body', {
      body: req.body,
      files: req.files,
      headers: req.headers
    });

    const processedBody = {
      ...req.body,
      price: req.body.price ? Number(req.body.price) : undefined,
      isVegetarian: req.body.isVegetarian === 'true',
      isAvailable: req.body.isAvailable === 'true',
      preparationTime: req.body.preparationTime ? Number(req.body.preparationTime) : undefined,
      nutritionalInfo: req.body.nutritionalInfo 
        ? JSON.parse(req.body.nutritionalInfo) 
        : undefined,
      
      description: (() => {
        if (!req.body.description) return undefined;
        
        const cleanDescription = req.body.description
          .replace(/^(GET|POST|info:).*$/gm, '') 
          .replace(/\r\n/g, ' ') 
          .replace(/\s+/g, ' ')   
          .trim();  
        
        return cleanDescription;
      })(),
      
      allergens: (() => {
        try {
          if (!req.body.allergens) return undefined;
          
          if (typeof req.body.allergens === 'string') {
            try {
              const parsedAllergens = JSON.parse(req.body.allergens);
              return Array.isArray(parsedAllergens) ? parsedAllergens : [parsedAllergens];
            } catch (jsonError) {
              const cleanedStr = req.body.allergens
                .replace(/^\[|\]$/g, '')  
                .replace(/"/g, '')       
                .split(',')             
                .map(item => item.trim()) 
                .filter(item => item);    
              
              return cleanedStr;
            }
          }
          
          return Array.isArray(req.body.allergens) 
            ? req.body.allergens 
            : [req.body.allergens];
        } catch (error) {
          logger.error('Error parsing allergens', {
            originalAllergens: req.body.allergens,
            error
          });
          return undefined;
        }
      })()
    };

    const schema = req.method === 'PUT' ? updateMenuItemSchema : createMenuItemSchema;

    const { error, value } = schema.validate(processedBody, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Menu Item Validation Failed', {
        validationErrors: error.details,
        requestId: req.id
      });

      const formattedErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new AppError('Validation failed', 400, {
        errors: formattedErrors
      }));
    }

    req.body = value;

    logger.info('Menu Item Validation Successful', {
      validatedBody: req.body,
      requestId: req.id
    });

    next();
  } catch (error) {
    logger.error('Validation Error', error);
    next(new AppError(error.message || 'Invalid input data', 400));
  }
};

export default { validateMenuItem };
// src/validators/restaurantValidator.js
import Joi from 'joi';
import AppError from '../utils/AppError.js';

const createMenuItemSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),

  description: Joi.string()
    .required()
    .min(10)
    .max(500)
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 500 characters'
    }),

  price: Joi.number()
    .required()
    .min(0)
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price cannot be negative'
    }),

  category: Joi.string()
    .required()
    .valid('appetizer', 'main course', 'dessert', 'beverage', 'special')
    .messages({
      'any.only': 'Invalid category'
    }),

  isVegetarian: Joi.boolean()
    .default(false),

  spicyLevel: Joi.string()
    .valid('mild', 'medium', 'hot', 'extra hot')
    .optional(),

  preparationTime: Joi.number()
    .min(0)
    .optional(),

  allergens: Joi.array()
    .items(Joi.string().valid(
      'nuts',
      'dairy',
      'gluten',
      'soy',
      'shellfish',
      'eggs'
    ))
    .optional(),

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
  const schema = req.method === 'PUT' ? updateMenuItemSchema : createMenuItemSchema;

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details
      .map(detail => detail.message)
      .join(', ');
    return next(new AppError(errorMessage, 400));
  }

  req.body = value;
  next();
};

export default { validateMenuItem };
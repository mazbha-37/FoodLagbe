const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.min': 'Category name must be at least 2 characters',
    'string.max': 'Category name cannot exceed 50 characters',
    'any.required': 'Category name is required',
  }),
  sortOrder: Joi.number().integer().optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  sortOrder: Joi.number().integer().optional(),
}).min(1);

const createMenuItemSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Item name must be at least 2 characters',
    'string.max': 'Item name cannot exceed 100 characters',
    'any.required': 'Item name is required',
  }),
  description: Joi.string().trim().max(200).optional().allow(''),
  price: Joi.number().integer().min(1).max(99999).required().messages({
    'number.integer': 'Price must be a whole number',
    'number.min': 'Price must be at least 1',
    'number.max': 'Price cannot exceed 99999',
    'any.required': 'Price is required',
  }),
  isAvailable: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional(),
});

const updateMenuItemSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().max(200).optional().allow(''),
  price: Joi.number().integer().min(1).max(99999).optional(),
  isAvailable: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional(),
}).min(1);

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
};

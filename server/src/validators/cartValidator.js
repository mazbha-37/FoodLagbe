const Joi = require('joi');

const addToCartSchema = Joi.object({
  menuItemId: Joi.string().hex().length(24).required().messages({
    'any.required': 'menuItemId is required',
  }),
  quantity: Joi.number().integer().min(1).max(20).default(1),
  specialInstructions: Joi.string().max(500).optional().allow(''),
});

module.exports = { addToCartSchema };

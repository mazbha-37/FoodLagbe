const Joi = require('joi');

const applyCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().required().messages({
    'any.required': 'Coupon code is required',
  }),
  restaurantId: Joi.string().hex().length(24).required().messages({
    'any.required': 'restaurantId is required',
  }),
  subtotal: Joi.number().positive().required().messages({
    'number.positive': 'Subtotal must be a positive number',
    'any.required': 'Subtotal is required',
  }),
});

module.exports = { applyCouponSchema };

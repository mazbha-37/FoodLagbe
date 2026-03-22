const Joi = require('joi');

const placeOrderSchema = Joi.object({
  paymentMethod: Joi.string().valid('stripe', 'cod').required().messages({
    'any.only': 'Payment method must be stripe or cod',
    'any.required': 'Payment method is required',
  }),
  deliveryAddress: Joi.object({
    address: Joi.string().trim().min(5).required().messages({
      'any.required': 'Delivery address is required',
    }),
    latitude: Joi.number().min(-90).max(90).required().messages({
      'any.required': 'Delivery latitude is required',
    }),
    longitude: Joi.number().min(-180).max(180).required().messages({
      'any.required': 'Delivery longitude is required',
    }),
  }).required(),
  orderInstructions: Joi.string().max(1000).optional().allow(''),
  couponCode: Joi.string().uppercase().optional().allow(''),
});

const cancelOrderSchema = Joi.object({
  reason: Joi.string().trim().min(10).max(200).required().messages({
    'string.min': 'Reason must be at least 10 characters',
    'string.max': 'Reason cannot exceed 200 characters',
    'any.required': 'Cancellation reason is required',
  }),
});

module.exports = { placeOrderSchema, cancelOrderSchema };

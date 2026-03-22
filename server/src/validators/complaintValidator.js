const Joi = require('joi');

exports.createComplaintSchema = Joi.object({
  orderId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Order ID is required',
  }),
  subject: Joi.string().min(5).max(100).required().messages({
    'string.min': 'Subject must be at least 5 characters',
    'string.max': 'Subject cannot exceed 100 characters',
    'any.required': 'Subject is required',
  }),
  description: Joi.string().min(20).max(1000).required().messages({
    'string.min': 'Description must be at least 20 characters',
    'string.max': 'Description cannot exceed 1000 characters',
    'any.required': 'Description is required',
  }),
});

exports.updateComplaintSchema = Joi.object({
  status: Joi.string().valid('reviewing', 'resolved').required().messages({
    'any.only': 'Status must be reviewing or resolved',
    'any.required': 'Status is required',
  }),
  adminNote: Joi.when('status', {
    is: 'resolved',
    then: Joi.string().min(10).max(500).required().messages({
      'string.min': 'Admin note must be at least 10 characters',
      'string.max': 'Admin note cannot exceed 500 characters',
      'any.required': 'Admin note is required when resolving a complaint',
    }),
    otherwise: Joi.string().min(10).max(500).optional(),
  }),
});

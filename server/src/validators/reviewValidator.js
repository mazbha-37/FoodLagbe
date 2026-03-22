const Joi = require('joi');

exports.createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.integer': 'Rating must be a whole number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required',
  }),
  comment: Joi.string().min(10).max(1000).required().messages({
    'string.min': 'Comment must be at least 10 characters',
    'string.max': 'Comment cannot exceed 1000 characters',
    'any.required': 'Comment is required',
  }),
});

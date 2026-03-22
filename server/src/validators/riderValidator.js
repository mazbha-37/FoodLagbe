const Joi = require('joi');

exports.riderApplicationSchema = Joi.object({
  nidNumber: Joi.string()
    .pattern(/^\d{10,17}$/)
    .required()
    .messages({
      'string.pattern.base': 'NID number must be 10 to 17 digits',
      'any.required': 'NID number is required',
    }),
  vehicleType: Joi.string().valid('bicycle', 'motorcycle', 'car').required().messages({
    'any.only': 'Vehicle type must be bicycle, motorcycle, or car',
    'any.required': 'Vehicle type is required',
  }),
  vehicleRegNumber: Joi.when('vehicleType', {
    is: Joi.valid('motorcycle', 'car'),
    then: Joi.string().min(5).max(20).required().messages({
      'string.min': 'Vehicle registration number must be at least 5 characters',
      'string.max': 'Vehicle registration number cannot exceed 20 characters',
      'any.required': 'Vehicle registration number is required for motorcycle/car',
    }),
    otherwise: Joi.string().min(5).max(20).optional().allow(''),
  }),
});

exports.updateLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required().messages({
    'any.required': 'Latitude is required',
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'any.required': 'Longitude is required',
  }),
});

const Joi = require('joi');

const CUISINE_TYPES = [
  'Bangladeshi', 'Indian', 'Chinese', 'Thai', 'Italian', 'American',
  'Fast Food', 'Burgers', 'Pizza', 'Biryani', 'Seafood', 'Desserts',
  'Beverages', 'Healthy', 'Vegetarian', 'Bakery',
];

const openingHourSchema = Joi.object({
  day: Joi.number().integer().min(0).max(6).required(),
  isOpen: Joi.boolean().required(),
  openTime: Joi.when('isOpen', {
    is: true,
    then: Joi.string().pattern(/^\d{2}:\d{2}$/).required().messages({
      'string.pattern.base': 'openTime must be in HH:mm format',
      'any.required': 'openTime is required when isOpen is true',
    }),
    otherwise: Joi.string().pattern(/^\d{2}:\d{2}$/).optional().allow('', null),
  }),
  closeTime: Joi.when('isOpen', {
    is: true,
    then: Joi.string().pattern(/^\d{2}:\d{2}$/).required().messages({
      'string.pattern.base': 'closeTime must be in HH:mm format',
      'any.required': 'closeTime is required when isOpen is true',
    }),
    otherwise: Joi.string().pattern(/^\d{2}:\d{2}$/).optional().allow('', null),
  }),
});

const restaurantFields = {
  restaurantName: Joi.string().trim().min(3).max(100).messages({
    'string.min': 'Restaurant name must be at least 3 characters',
    'string.max': 'Restaurant name cannot exceed 100 characters',
  }),
  description: Joi.string().trim().min(20).max(500).messages({
    'string.min': 'Description must be at least 20 characters',
    'string.max': 'Description cannot exceed 500 characters',
  }),
  address: Joi.string().trim().min(10).max(200).messages({
    'string.min': 'Address must be at least 10 characters',
    'string.max': 'Address cannot exceed 200 characters',
  }),
  latitude: Joi.number().min(-90).max(90).messages({
    'number.min': 'Latitude must be between -90 and 90',
    'number.max': 'Latitude must be between -90 and 90',
  }),
  longitude: Joi.number().min(-180).max(180).messages({
    'number.min': 'Longitude must be between -180 and 180',
    'number.max': 'Longitude must be between -180 and 180',
  }),
  phone: Joi.string().pattern(/^(\+880|0)1[3-9]\d{8}$/).messages({
    'string.pattern.base': 'Please provide a valid Bangladeshi phone number',
  }),
  cuisineTypes: Joi.array()
    .items(Joi.string().valid(...CUISINE_TYPES))
    .min(1)
    .max(5)
    .messages({
      'array.min': 'At least one cuisine type is required',
      'array.max': 'Cannot have more than 5 cuisine types',
      'any.only': 'Invalid cuisine type',
    }),
  openingHours: Joi.array().items(openingHourSchema).length(7).messages({
    'array.length': 'openingHours must have exactly 7 entries (one per day)',
  }),
  estimatedPrepTime: Joi.number().integer().min(5).max(120).messages({
    'number.min': 'Prep time must be at least 5 minutes',
    'number.max': 'Prep time cannot exceed 120 minutes',
  }),
};

const createRestaurantSchema = Joi.object({
  restaurantName: restaurantFields.restaurantName.required(),
  description: restaurantFields.description.required(),
  address: restaurantFields.address.required(),
  latitude: restaurantFields.latitude.required(),
  longitude: restaurantFields.longitude.required(),
  phone: restaurantFields.phone.required(),
  cuisineTypes: restaurantFields.cuisineTypes.required(),
  openingHours: restaurantFields.openingHours.required(),
  estimatedPrepTime: restaurantFields.estimatedPrepTime.required(),
});

const updateRestaurantSchema = Joi.object({
  restaurantName: restaurantFields.restaurantName.optional(),
  description: restaurantFields.description.optional(),
  address: restaurantFields.address.optional(),
  latitude: restaurantFields.latitude.optional(),
  longitude: restaurantFields.longitude.optional(),
  phone: restaurantFields.phone.optional(),
  cuisineTypes: restaurantFields.cuisineTypes.optional(),
  openingHours: restaurantFields.openingHours.optional(),
  estimatedPrepTime: restaurantFields.estimatedPrepTime.optional(),
}).min(1);

module.exports = { createRestaurantSchema, updateRestaurantSchema };

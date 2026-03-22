const mongoose = require('mongoose');

const CUISINE_TYPES = [
  'Bangladeshi', 'Indian', 'Chinese', 'Thai', 'Italian', 'American',
  'Fast Food', 'Burgers', 'Pizza', 'Biryani', 'Seafood', 'Desserts',
  'Beverages', 'Healthy', 'Vegetarian', 'Bakery',
];

const openingHourSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6 },
    isOpen: Boolean,
    openTime: String,
    closeTime: String,
  },
  { _id: false }
);

const restaurantSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      minlength: [10, 'Address must be at least 10 characters'],
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates are required'],
      },
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^(\+880|0)1[3-9]\d{8}$/, 'Please provide a valid Bangladeshi phone number'],
    },
    cuisineTypes: {
      type: [String],
      required: [true, 'At least one cuisine type is required'],
      validate: [
        {
          validator: (arr) => arr.length >= 1 && arr.length <= 5,
          message: 'Cuisine types must have between 1 and 5 items',
        },
        {
          validator: (arr) => arr.every((c) => CUISINE_TYPES.includes(c)),
          message: 'Invalid cuisine type provided',
        },
      ],
    },
    openingHours: [openingHourSchema],
    estimatedPrepTime: {
      type: Number,
      required: [true, 'Estimated prep time is required'],
      min: [5, 'Prep time must be at least 5 minutes'],
      max: [120, 'Prep time cannot exceed 120 minutes'],
    },
    coverPhoto: {
      url: { type: String, required: [true, 'Cover photo URL is required'] },
      publicId: { type: String, required: [true, 'Cover photo public ID is required'] },
    },
    tradeLicensePhoto: {
      url: { type: String, required: [true, 'Trade license photo URL is required'] },
      publicId: { type: String, required: [true, 'Trade license photo public ID is required'] },
    },
    isOpen: { type: Boolean, default: false },
    applicationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: String,
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 15 },
  },
  { timestamps: true }
);

restaurantSchema.index({ location: '2dsphere' });
// ownerId unique index already created via unique:true in field definition
restaurantSchema.index({ applicationStatus: 1 });
restaurantSchema.index({ cuisineTypes: 1 });
restaurantSchema.index({ name: 'text' });

module.exports = mongoose.model('Restaurant', restaurantSchema);

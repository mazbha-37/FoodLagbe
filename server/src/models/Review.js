const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant ID is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    images: {
      type: [
        {
          url: String,
          publicId: String,
        },
      ],
      validate: [
        (arr) => arr.length <= 3,
        'You can upload at most 3 images',
      ],
    },
  },
  { timestamps: true }
);

// orderId unique index already created via unique:true in field definition
reviewSchema.index({ restaurantId: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);

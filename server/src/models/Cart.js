const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: [true, 'Menu item ID is required'],
    },
    quantity: {
      type: Number,
      min: [1, 'Quantity must be at least 1'],
      max: [20, 'Quantity cannot exceed 20'],
      default: 1,
    },
    specialInstructions: {
      type: String,
      maxlength: [500, 'Special instructions cannot exceed 500 characters'],
      default: '',
    },
    itemPrice: { type: Number, required: [true, 'Item price is required'] },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      unique: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant ID is required'],
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

// customerId unique index already created via unique:true in field definition

module.exports = mongoose.model('Cart', cartSchema);

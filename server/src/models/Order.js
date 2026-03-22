const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: [true, 'Item name is required'] },
    price: { type: Number, required: [true, 'Item price is required'] },
    quantity: { type: Number, required: [true, 'Item quantity is required'] },
    specialInstructions: { type: String, default: '' },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: [true, 'Order number is required'],
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
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    items: [orderItemSchema],
    orderInstructions: {
      type: String,
      maxlength: [1000, 'Order instructions cannot exceed 1000 characters'],
      default: '',
    },
    deliveryAddress: {
      address: { type: String, required: [true, 'Delivery address is required'] },
      latitude: { type: Number, required: [true, 'Latitude is required'] },
      longitude: { type: Number, required: [true, 'Longitude is required'] },
    },
    status: {
      type: String,
      enum: ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way', 'delivered', 'cancelled'],
      default: 'placed',
    },
    statusHistory: [statusHistorySchema],
    cancellation: {
      cancelledBy: { type: String, enum: ['customer', 'restaurant', 'admin'] },
      reason: String,
      cancelledAt: Date,
    },
    subtotal: { type: Number, required: [true, 'Subtotal is required'] },
    deliveryFee: { type: Number, required: [true, 'Delivery fee is required'] },
    platformFee: { type: Number, default: 10 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: [true, 'Total is required'] },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponCode: { type: String, default: '' },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'cod'],
      required: [true, 'Payment method is required'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'cod'],
      default: 'pending',
    },
    stripeSessionId: String,
    deliveryDistance: Number,
    estimatedDeliveryTime: Number,
    actualDeliveryTime: Number,
    isReviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ riderId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
// orderNumber unique index already created via unique:true in field definition
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);

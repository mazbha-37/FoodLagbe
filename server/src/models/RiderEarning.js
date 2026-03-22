const mongoose = require('mongoose');

const riderEarningSchema = new mongoose.Schema(
  {
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Rider ID is required'],
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
    },
    baseRate: { type: Number, default: 30 },
    distanceBonus: { type: Number, required: [true, 'Distance bonus is required'] },
    totalEarning: { type: Number, required: [true, 'Total earning is required'] },
    deliveryDistance: { type: Number, required: [true, 'Delivery distance is required'] },
  },
  { timestamps: true }
);

riderEarningSchema.index({ riderId: 1, createdAt: -1 });

module.exports = mongoose.model('RiderEarning', riderEarningSchema);

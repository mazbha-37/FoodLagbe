const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
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
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      minlength: [5, 'Subject must be at least 5 characters'],
      maxlength: [100, 'Subject cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved'],
      default: 'pending',
    },
    adminNote: {
      type: String,
      maxlength: [500, 'Admin note cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

// orderId unique index already created via unique:true in field definition
complaintSchema.index({ status: 1 });
complaintSchema.index({ customerId: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);

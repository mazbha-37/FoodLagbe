const Message = require('../models/Message');
const Order = require('../models/Order');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { createAndEmit } = require('../services/notificationService');

const ACTIVE_STATUSES = [
  'accepted', 'preparing', 'ready_for_pickup',
  'picked_up', 'on_the_way', 'delivered',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getParticipantRole = (order, userId) => {
  if (order.customerId.toString() === userId.toString()) return 'customer';
  if (order.riderId && order.riderId.toString() === userId.toString()) return 'rider';
  return null;
};

// ─── Get messages for an order ────────────────────────────────────────────────

exports.getMessages = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) return next(new AppError('Order not found', 404));

  const role = getParticipantRole(order, req.user.userId);
  if (!role) return next(new AppError('Not authorized to view messages for this order', 403));

  const messages = await Message.find({ orderId: order._id })
    .sort({ createdAt: 1 })
    .lean();

  res.status(200).json({ status: 'success', data: { messages } });
});

// ─── Send a message ───────────────────────────────────────────────────────────

exports.sendMessage = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));

  const senderRole = getParticipantRole(order, req.user.userId);
  if (!senderRole) return next(new AppError('Not authorized to message on this order', 403));

  if (!ACTIVE_STATUSES.includes(order.status))
    return next(new AppError('Messaging is not available for this order status', 400));

  const { text } = req.body;
  if (!text || text.trim().length === 0)
    return next(new AppError('Message text is required', 400));
  if (text.length > 500)
    return next(new AppError('Message cannot exceed 500 characters', 400));

  const message = await Message.create({
    orderId: order._id,
    senderId: req.user.userId,
    senderRole,
    text: text.trim(),
  });

  const io = req.app.get('io');

  // Emit to order room so both parties receive in real-time
  if (io) io.to(`order:${order._id}`).emit('new_message', message);

  // Notify the other participant
  const recipientId = senderRole === 'customer' ? order.riderId : order.customerId;
  if (recipientId) {
    const preview = text.trim().substring(0, 50);
    await createAndEmit(io, {
      userId: recipientId,
      title: 'New message',
      message: `${req.user.name}: ${preview}${text.length > 50 ? '…' : ''}`,
      type: 'order_update',
      orderId: order._id,
    });
  }

  res.status(201).json({ status: 'success', data: { message } });
});

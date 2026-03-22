const socketAuth = require('./socketAuth');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const User = require('../models/User');
const Message = require('../models/Message');
const { createAndEmit } = require('../services/notificationService');

// Order statuses where messaging is permitted
const MESSAGEABLE_STATUSES = [
  'accepted', 'preparing', 'ready_for_pickup',
  'picked_up', 'on_the_way', 'delivered',
];

const initializeSocket = (io) => {
  // ─── Auth middleware ────────────────────────────────────────────────────────

  io.use(socketAuth);

  // ─── Connection handler ─────────────────────────────────────────────────────

  io.on('connection', async (socket) => {
    const { userId, role } = socket.user;
    console.log(`User connected: ${userId} (${role}) [socket ${socket.id}]`);

    // ── Auto-join personal room ────────────────────────────────────────────────
    socket.join(`user:${userId}`);

    // ── Role-based room joins on connect ──────────────────────────────────────
    try {
      if (role === 'restaurant_owner') {
        const restaurant = await Restaurant.findOne({ ownerId: userId }).select('_id').lean();
        if (restaurant) {
          socket.join(`restaurant:${restaurant._id}`);
        }
      }

      if (role === 'rider') {
        // Rejoin active delivery order room on reconnect
        const rider = await User.findById(userId).select('currentDeliveryId').lean();
        if (rider?.currentDeliveryId) {
          socket.join(`order:${rider.currentDeliveryId}`);
        }
      }

      if (role === 'customer') {
        // Rejoin all active order rooms on reconnect
        const activeOrders = await Order.find({
          customerId: userId,
          status: { $nin: ['delivered', 'cancelled'] },
        }).select('_id').lean();
        for (const order of activeOrders) {
          socket.join(`order:${order._id}`);
        }
      }
    } catch (err) {
      console.error(`[socket] Room auto-join error for ${userId}:`, err.message);
    }

    // ─── join_order ────────────────────────────────────────────────────────────
    // Client calls this when navigating to an order detail page.

    socket.on('join_order', async (payload) => {
      const orderId = payload?.orderId ?? payload; // accept both { orderId } and bare string
      if (!orderId) return;

      try {
        const order = await Order.findById(orderId).select('customerId riderId restaurantId').lean();
        if (!order) return;

        const isCustomer = order.customerId?.toString() === userId;
        const isRider = order.riderId?.toString() === userId;
        const isAdmin = role === 'admin';

        let isOwner = false;
        if (role === 'restaurant_owner') {
          const restaurant = await Restaurant.findOne({ ownerId: userId }).select('_id').lean();
          isOwner = restaurant?._id.toString() === order.restaurantId?.toString();
        }

        if (isCustomer || isRider || isOwner || isAdmin) {
          socket.join(`order:${orderId}`);
        }
      } catch { /* silent */ }
    });

    // ─── leave_order ───────────────────────────────────────────────────────────

    socket.on('leave_order', (payload) => {
      const orderId = payload?.orderId ?? payload;
      if (orderId) socket.leave(`order:${orderId}`);
    });

    // ─── rider_location_update ─────────────────────────────────────────────────
    // Sent by the rider app every few seconds during an active delivery.

    socket.on('rider_location_update', async (payload) => {
      const { orderId, latitude, longitude, heading = null, speed = null } = payload || {};
      if (!orderId || latitude == null || longitude == null) return;
      if (role !== 'rider') return;

      try {
        const order = await Order.findById(orderId).select('riderId').lean();
        if (!order || order.riderId?.toString() !== userId) return;

        // Fire-and-forget DB update — do not await so we don't block the broadcast
        User.findByIdAndUpdate(userId, {
          'currentLocation.coordinates': [parseFloat(longitude), parseFloat(latitude)],
        }).exec().catch(() => {});

        // Broadcast to all order room participants except the sender
        socket.to(`order:${orderId}`).emit('rider_location_update', {
          orderId,
          latitude,
          longitude,
          heading,
          speed,
          timestamp: Date.now(),
        });
      } catch { /* silent */ }
    });

    // ─── send_message ──────────────────────────────────────────────────────────
    // Real-time chat between customer and assigned rider.

    socket.on('send_message', async (payload) => {
      const { orderId, text } = payload || {};
      if (!orderId || !text) return;

      const trimmed = typeof text === 'string' ? text.trim() : '';
      if (trimmed.length === 0 || trimmed.length > 500) return;

      try {
        const order = await Order.findById(orderId).lean();
        if (!order) return;

        const isCustomer = order.customerId?.toString() === userId;
        const isRider = order.riderId?.toString() === userId;
        if (!isCustomer && !isRider) return;

        if (!MESSAGEABLE_STATUSES.includes(order.status)) return;

        const senderRole = isCustomer ? 'customer' : 'rider';

        const message = await Message.create({
          orderId: order._id,
          senderId: userId,
          senderRole,
          text: trimmed,
        });

        // Broadcast to all participants in the order room
        io.to(`order:${orderId}`).emit('new_message', {
          messageId: message._id,
          orderId,
          senderId: userId,
          senderRole,
          text: message.text,
          timestamp: message.createdAt,
        });

        // Push notification to the other party
        const recipientId = isCustomer
          ? order.riderId?.toString()
          : order.customerId?.toString();

        if (recipientId) {
          const sender = await User.findById(userId).select('name').lean();
          const preview = trimmed.substring(0, 50) + (trimmed.length > 50 ? '…' : '');
          await createAndEmit(io, {
            userId: recipientId,
            title: 'New message',
            message: `${sender?.name || 'User'}: ${preview}`,
            type: 'order_update',
            orderId: order._id,
          });
        }
      } catch (err) {
        console.error('[socket] send_message error:', err.message);
      }
    });

    // ─── delivery_response ─────────────────────────────────────────────────────
    // Placeholder for the rider accept/decline flow (Phase 5).

    socket.on('delivery_response', (payload) => {
      const { orderId, accepted } = payload || {};
      console.log(
        `[delivery_response] rider=${userId} order=${orderId} accepted=${accepted}`
      );
      // TODO: Phase 5 — full accept/decline flow with re-assignment on decline
    });

    // ─── disconnect ────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId} [socket ${socket.id}]`);
      // Note: rider availability is kept as-is — they may reconnect.
      // The cron job handles stale orders; rider toggles availability themselves.
    });
  });
};

module.exports = initializeSocket;

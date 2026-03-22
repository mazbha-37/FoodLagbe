const stripe = require('../config/stripe');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { createAndEmit } = require('../services/notificationService');

const scheduleAutoReject = (io, orderId, orderNumber, customerId) => {
  setTimeout(async () => {
    try {
      const order = await Order.findById(orderId);
      if (!order || order.status !== 'placed') return;

      order.status = 'cancelled';
      order.cancellation = {
        cancelledBy: 'admin',
        reason: 'Restaurant did not respond in time',
        cancelledAt: new Date(),
      };
      order.statusHistory.push({ status: 'cancelled', updatedBy: null });
      await order.save();

      if (io) io.to(`order:${orderId}`).emit('order_cancelled', { orderId, reason: order.cancellation.reason });

      await createAndEmit(io, {
        userId: customerId,
        title: 'Order cancelled',
        message: 'Your order was cancelled — restaurant did not respond in time. A refund has been initiated.',
        type: 'order_update',
        orderId,
      });

      if (order.paymentStatus === 'paid' && order.stripeSessionId) {
        const { createRefund } = require('../services/stripeService');
        await createRefund(order.stripeSessionId).catch(() => {});
        order.paymentStatus = 'refunded';
        await order.save();
      }
    } catch { /* silent */ }
  }, 5 * 60 * 1000);
};

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const io = req.app.get('io');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (!orderId) return res.status(200).json({ received: true });

      const order = await Order.findById(orderId);
      if (!order) return res.status(200).json({ received: true });

      order.paymentStatus = 'paid';
      order.stripeSessionId = session.id;
      await order.save();

      const restaurant = await Restaurant.findById(order.restaurantId).lean();
      if (restaurant) {
        if (io) io.to(`restaurant:${restaurant._id}`).emit('new_order', { orderId, orderNumber: order.orderNumber });
        await createAndEmit(io, {
          userId: restaurant.ownerId.toString(),
          title: 'New order received!',
          message: `Stripe payment confirmed. Order #${order.orderNumber} — ৳${order.total}`,
          type: 'order_update',
          orderId: order._id,
        });
      }

      scheduleAutoReject(io, order._id, order.orderNumber, order.customerId.toString());
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (!orderId) return res.status(200).json({ received: true });

      const order = await Order.findById(orderId);
      if (!order) return res.status(200).json({ received: true });

      order.paymentStatus = 'failed';
      order.status = 'cancelled';
      order.cancellation = {
        cancelledBy: 'admin',
        reason: 'Payment session expired',
        cancelledAt: new Date(),
      };
      order.statusHistory.push({ status: 'cancelled', updatedBy: null });
      await order.save();

      await createAndEmit(io, {
        userId: order.customerId.toString(),
        title: 'Payment failed',
        message: `Your payment for order #${order.orderNumber} expired. Please place a new order.`,
        type: 'order_update',
        orderId: order._id,
      });
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.status(200).json({ received: true });
};

const cron = require('node-cron');
const Order = require('../models/Order');
const { createRefund } = require('../services/stripeService');
const { createAndEmit } = require('../services/notificationService');

const startOrderTimeoutJob = (io) => {
  // Run every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const timedOutOrders = await Order.find({
        status: 'placed',
        createdAt: { $lt: fiveMinutesAgo },
      });

      for (const order of timedOutOrders) {
        order.status = 'cancelled';
        order.cancellation = {
          cancelledBy: 'admin',
          reason: 'Restaurant did not respond in time',
          cancelledAt: new Date(),
        };
        order.statusHistory.push({ status: 'cancelled', updatedBy: null });
        await order.save();

        if (io) io.to(`order:${order._id}`).emit('order_cancelled', {
          orderId: order._id,
          reason: order.cancellation.reason,
        });

        await createAndEmit(io, {
          userId: order.customerId.toString(),
          title: 'Order cancelled',
          message: `Order #${order.orderNumber} was cancelled — restaurant did not respond in time.`,
          type: 'order_update',
          orderId: order._id,
        });

        if (order.paymentStatus === 'paid' && order.stripeSessionId) {
          try {
            await createRefund(order.stripeSessionId);
            order.paymentStatus = 'refunded';
            await order.save();
          } catch { /* silent — refund failure shouldn't crash the job */ }
        }
      }

      if (timedOutOrders.length > 0) {
        console.log(`[OrderTimeoutJob] Cancelled ${timedOutOrders.length} timed-out order(s)`);
      }
    } catch (err) {
      console.error('[OrderTimeoutJob] Error:', err.message);
    }
  });

  console.log('[OrderTimeoutJob] Started — checking every 30s for timed-out orders');
};

module.exports = { startOrderTimeoutJob };

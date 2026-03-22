const User = require('../models/User');
const Order = require('../models/Order');
const haversine = require('../utils/haversine');
const { createAndEmit } = require('./notificationService');

/**
 * MVP auto-assignment: nearest available rider within range.
 * Full accept/decline socket flow to be added in Phase 5 (rider frontend).
 */
const assignRider = async (io, order) => {
  const restaurantCoords = order._restaurantCoords; // set by caller
  const restaurantPoint = restaurantCoords
    ? { latitude: restaurantCoords[1], longitude: restaurantCoords[0] }
    : null;

  const tryAssign = async (maxKm) => {
    const availableRiders = await User.find({
      role: 'rider',
      isAvailable: true,
      isSuspended: false,
      currentDeliveryId: null,
    }).lean();

    if (!availableRiders.length) return false;

    let candidates = availableRiders;

    // Filter by distance if restaurant coords are available
    if (restaurantPoint) {
      candidates = availableRiders
        .map((r) => {
          const [lng, lat] = r.currentLocation?.coordinates || [0, 0];
          const dist = haversine(restaurantPoint, { latitude: lat, longitude: lng });
          return { ...r, _distance: dist };
        })
        .filter((r) => r._distance <= maxKm)
        .sort((a, b) => a._distance - b._distance);
    }

    if (!candidates.length) return false;

    const rider = candidates[0];

    // Assign
    await User.findByIdAndUpdate(rider._id, {
      isAvailable: false,
      currentDeliveryId: order._id,
    });

    await Order.findByIdAndUpdate(order._id, { riderId: rider._id });

    // Notify rider
    await createAndEmit(io, {
      userId: rider._id.toString(),
      title: 'New delivery request',
      message: `Order #${order.orderNumber} has been assigned to you`,
      type: 'delivery_update',
      orderId: order._id,
    });

    // Notify customer
    await createAndEmit(io, {
      userId: order.customerId.toString(),
      title: 'Rider assigned',
      message: `${rider.name} is heading to the restaurant`,
      type: 'delivery_update',
      orderId: order._id,
    });

    // Emit assignment events
    if (io) {
      // Order room (customer + restaurant owner both get this if they joined)
      io.to(`order:${order._id}`).emit('rider_assigned', {
        riderId: rider._id,
        riderName: rider.name,
        riderPhone: rider.phone,
      });

      // Customer personal room — include full rider contact info
      io.to(`user:${order.customerId}`).emit('delivery_assigned', {
        orderId: order._id,
        riderName: rider.name,
        riderPhone: rider.phone,
      });

      // Restaurant personal room — no phone exposed
      io.to(`restaurant:${order.restaurantId}`).emit('delivery_assigned', {
        orderId: order._id,
        riderName: rider.name,
      });
    }

    return true;
  };

  // Try within 5km first, then 10km
  const assigned = await tryAssign(5);
  if (!assigned) {
    const assigned10 = await tryAssign(10);
    if (!assigned10) {
      // Schedule retry in 2 minutes, up to 3 retries (6 min total)
      let retries = 0;
      const retryInterval = setInterval(async () => {
        retries++;
        const freshOrder = await Order.findById(order._id).lean();
        if (!freshOrder || freshOrder.riderId || freshOrder.status === 'cancelled') {
          clearInterval(retryInterval);
          return;
        }

        const assigned = await tryAssign(10);
        if (assigned || retries >= 3) {
          clearInterval(retryInterval);
          if (!assigned) {
            // No rider found — notify restaurant owner
            const restaurant = await require('../models/Restaurant').findById(order.restaurantId).lean();
            if (restaurant) {
              await createAndEmit(io, {
                userId: restaurant.ownerId.toString(),
                title: 'No rider available',
                message: `No rider available for order #${order.orderNumber}. Please contact support.`,
                type: 'system',
                orderId: order._id,
              });
            }
          }
        }
      }, 2 * 60 * 1000);
    }
  }
};

module.exports = { assignRider };

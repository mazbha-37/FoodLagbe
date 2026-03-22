const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const RiderEarning = require('../models/RiderEarning');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const haversine = require('../utils/haversine');
const { calculateDeliveryFee } = require('../services/deliveryFeeCalculator');
const { createCheckoutSession, createRefund } = require('../services/stripeService');
const { createAndEmit } = require('../services/notificationService');
const { assignRider } = require('../services/riderAssignment');
const { validateCoupon } = require('./couponController');
const generateOrderNumber = require('../utils/generateOrderNumber');

const PLATFORM_FEE = 10;

// ─── Allowed status transitions ───────────────────────────────────────────────

const TRANSITIONS = {
  restaurant_owner: {
    placed: ['accepted', 'cancelled'],
    accepted: ['preparing'],
    preparing: ['ready_for_pickup'],
  },
  rider: {
    ready_for_pickup: ['picked_up'],
    picked_up: ['on_the_way'],
    on_the_way: ['delivered'],
  },
};

// ─── Auto-reject timer (5 min) ────────────────────────────────────────────────

const scheduleAutoReject = (io, orderId) => {
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
        userId: order.customerId.toString(),
        title: 'Order cancelled',
        message: 'Your order was cancelled — restaurant did not respond in time.',
        type: 'order_update',
        orderId: order._id,
      });

      if (order.paymentStatus === 'paid' && order.stripeSessionId) {
        await createRefund(order.stripeSessionId).catch(() => {});
        order.paymentStatus = 'refunded';
        await order.save();
      }
    } catch { /* silent */ }
  }, 5 * 60 * 1000);
};

// ─── Place Order ──────────────────────────────────────────────────────────────

exports.placeOrder = catchAsync(async (req, res, next) => {
  const { paymentMethod, deliveryAddress, orderInstructions = '', couponCode } = req.body;
  const customerId = req.user.userId;
  const io = req.app.get('io');

  // 0. Delivery address validation
  if (!deliveryAddress || !deliveryAddress.address || deliveryAddress.latitude == null || deliveryAddress.longitude == null) {
    return next(new AppError('Delivery address with latitude and longitude is required', 400, 'INVALID_ADDRESS'));
  }

  // 1. Cart validation
  const cart = await Cart.findOne({ customerId }).populate('items.menuItemId');
  if (!cart || !cart.items.length) {
    return next(new AppError('Your cart is empty', 400, 'EMPTY_CART'));
  }

  // 2 & 3. Re-validate items and prices
  const priceChanges = [];
  const invalidItems = [];

  for (const cartItem of cart.items) {
    const mi = cartItem.menuItemId;
    if (!mi || mi.isDeleted || !mi.isAvailable) {
      invalidItems.push(mi?.name || 'Unknown item');
      continue;
    }
    if (mi.price !== cartItem.itemPrice) {
      priceChanges.push({ name: mi.name, oldPrice: cartItem.itemPrice, newPrice: mi.price });
      cartItem.itemPrice = mi.price;
    }
  }

  if (invalidItems.length) {
    return next(new AppError(`Some items are no longer available: ${invalidItems.join(', ')}`, 400, 'ITEMS_UNAVAILABLE'));
  }
  if (priceChanges.length) {
    await cart.save();
    return res.status(400).json({
      success: false,
      message: 'Prices have been updated. Please review your cart.',
      priceChanges,
    });
  }

  // 4. Restaurant check
  const restaurant = await Restaurant.findById(cart.restaurantId);
  if (!restaurant || restaurant.applicationStatus !== 'approved') {
    return next(new AppError('Restaurant is not available', 400, 'RESTAURANT_UNAVAILABLE'));
  }
  if (!restaurant.isOpen) {
    return next(new AppError('Restaurant is currently closed', 400, 'RESTAURANT_CLOSED'));
  }

  // 5. Subtotal
  const subtotal = cart.items.reduce((s, i) => s + i.itemPrice * i.quantity, 0);

  // 6. Distance & delivery fee
  const coords = restaurant.location?.coordinates || [0, 0];
  const [rLng, rLat] = coords;
  const deliveryDistance = haversine(
    { latitude: rLat, longitude: rLng },
    { latitude: deliveryAddress.latitude, longitude: deliveryAddress.longitude }
  );
  const deliveryFee = calculateDeliveryFee(deliveryDistance);

  // 7. Coupon
  let discount = 0;
  let couponId = null;
  let validatedCouponCode = '';
  if (couponCode) {
    try {
      const { coupon, discount: d } = await validateCoupon(
        couponCode, cart.restaurantId, subtotal, customerId
      );
      discount = d;
      couponId = coupon._id;
      validatedCouponCode = coupon.code;
    } catch (err) {
      return next(err);
    }
  }

  // 8. Total
  const total = subtotal + deliveryFee + PLATFORM_FEE - discount;

  // 9. Order number
  const orderNumber = await generateOrderNumber();

  // 10. Items snapshot
  const orderItems = cart.items.map((i) => ({
    menuItemId: i.menuItemId._id,
    name: i.menuItemId.name,
    price: i.itemPrice,
    quantity: i.quantity,
    specialInstructions: i.specialInstructions || '',
  }));

  // 11. Create order
  const order = await Order.create({
    orderNumber,
    customerId,
    restaurantId: cart.restaurantId,
    items: orderItems,
    orderInstructions,
    deliveryAddress,
    subtotal,
    deliveryFee,
    platformFee: PLATFORM_FEE,
    discount,
    total,
    couponId,
    couponCode: validatedCouponCode,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'cod' : 'pending',
    deliveryDistance: Math.round(deliveryDistance * 100) / 100,
    estimatedDeliveryTime: Math.round(restaurant.estimatedPrepTime + deliveryDistance * 5),
    statusHistory: [{ status: 'placed', updatedBy: customerId }],
  });

  // 12. Increment coupon usage
  if (couponId) {
    await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
  }

  // 13. Clear cart
  await Cart.findByIdAndDelete(cart._id);

  // Stripe flow
  if (paymentMethod === 'stripe') {
    const lineItems = orderItems.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity }));
    // Add fees as line items
    lineItems.push({ name: 'Delivery Fee', price: deliveryFee, quantity: 1 });
    lineItems.push({ name: 'Platform Fee', price: PLATFORM_FEE, quantity: 1 });
    if (discount > 0) lineItems.push({ name: 'Discount', price: -discount, quantity: 1 });

    const session = await createCheckoutSession(order, lineItems.filter((i) => i.price > 0));
    order.stripeSessionId = session.id;
    await order.save();

    return res.status(200).json({ success: true, orderId: order._id, stripeUrl: session.url });
  }

  // COD flow
  const restaurantOwner = await User.findById(restaurant.ownerId).lean();
  if (restaurantOwner) {
    if (io) io.to(`restaurant:${restaurant._id}`).emit('new_order', { orderId: order._id, orderNumber });
    await createAndEmit(io, {
      userId: restaurantOwner._id.toString(),
      title: 'New order received!',
      message: `Order #${orderNumber} — ৳${total}`,
      type: 'order_update',
      orderId: order._id,
    });
  }

  scheduleAutoReject(io, order._id);

  res.status(201).json({ success: true, data: order });
});

// ─── Get Orders ───────────────────────────────────────────────────────────────

exports.getOrders = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 10, sort = '-createdAt' } = req.query;
  const { userId, role } = req.user;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  let filter = {};

  if (role === 'customer') {
    filter.customerId = userId;
  } else if (role === 'restaurant_owner') {
    const restaurant = await Restaurant.findOne({ ownerId: userId });
    if (!restaurant) {
      // Return empty results instead of 404 so the dashboard renders properly
      return res.status(200).json({
        success: true,
        results: [],
        currentPage: 1,
        totalPages: 0,
        totalResults: 0,
      });
    }
    filter.restaurantId = restaurant._id;
  } else if (role === 'rider') {
    filter.riderId = userId;
  }

  if (status) {
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }

  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .populate('restaurantId', 'name coverPhoto')
    .populate('riderId', 'name phone profilePhoto')
    .populate('customerId', 'name phone')
    .lean();

  res.status(200).json({
    success: true,
    results: orders,
    currentPage: pageNum,
    totalPages: Math.ceil(total / limitNum),
    totalResults: total,
  });
});

// ─── Get Order By ID ──────────────────────────────────────────────────────────

exports.getOrderById = catchAsync(async (req, res, next) => {
  const { userId, role } = req.user;

  const order = await Order.findById(req.params.id)
    .populate('restaurantId', 'name coverPhoto address phone location')
    .populate('riderId', 'name phone profilePhoto currentLocation')
    .populate('customerId', 'name phone');

  if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

  // Access control
  const isCustomer = order.customerId?._id?.toString() === userId;
  const isRider = order.riderId?._id?.toString() === userId;
  let isOwner = false;
  if (role === 'restaurant_owner') {
    const restaurant = await Restaurant.findOne({ ownerId: userId });
    isOwner = restaurant?._id.toString() === order.restaurantId?._id?.toString();
  }
  const isAdmin = role === 'admin';

  if (!isCustomer && !isRider && !isOwner && !isAdmin) {
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  }

  res.status(200).json({ success: true, data: order });
});

// ─── Update Order Status ──────────────────────────────────────────────────────

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, reason } = req.body;
  const { userId, role } = req.user;
  const io = req.app.get('io');

  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

  // Permission + transition validation
  const allowedNext = TRANSITIONS[role]?.[order.status];
  if (!allowedNext || !allowedNext.includes(status)) {
    return next(new AppError(`Invalid status transition: ${order.status} → ${status}`, 400, 'INVALID_TRANSITION'));
  }

  if (role === 'restaurant_owner') {
    const restaurant = await Restaurant.findOne({ ownerId: userId });
    if (!restaurant || restaurant._id.toString() !== order.restaurantId.toString()) {
      return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
    }
  }
  if (role === 'rider') {
    if (!order.riderId || order.riderId.toString() !== userId) {
      return next(new AppError('You are not assigned to this order', 403, 'FORBIDDEN'));
    }
  }

  order.status = status;
  order.statusHistory.push({ status, updatedBy: userId });

  // Handle restaurant rejection / cancellation
  if (status === 'cancelled') {
    order.cancellation = {
      cancelledBy: role === 'restaurant_owner' ? 'restaurant' : role === 'customer' ? 'customer' : 'admin',
      reason: reason || 'No reason provided',
      cancelledAt: new Date(),
    };

    // Refund if already paid
    if (order.paymentStatus === 'paid' && order.stripeSessionId) {
      await createRefund(order.stripeSessionId).catch(() => {});
      order.paymentStatus = 'refunded';
    }
  }

  await order.save();

  if (io) io.to(`order:${order._id}`).emit('order_status_update', { orderId: order._id, status });

  // Side effects per transition
  if (status === 'cancelled' && role === 'restaurant_owner') {
    await createAndEmit(io, {
      userId: order.customerId.toString(),
      title: 'Order rejected',
      message: `Your order #${order.orderNumber} was rejected by the restaurant: ${reason || 'No reason provided'}`,
      type: 'order_update',
      orderId: order._id,
    });
  }

  if (status === 'accepted') {
    const restaurant = await Restaurant.findById(order.restaurantId).lean();
    order._restaurantCoords = restaurant?.location?.coordinates;
    await assignRider(io, order);

    await createAndEmit(io, {
      userId: order.customerId.toString(),
      title: 'Order accepted!',
      message: `Your order #${order.orderNumber} has been accepted and is being prepared`,
      type: 'order_update',
      orderId: order._id,
    });
  }

  if (status === 'preparing') {
    await createAndEmit(io, {
      userId: order.customerId.toString(),
      title: 'Food being prepared',
      message: `Your order #${order.orderNumber} is now being prepared`,
      type: 'order_update',
      orderId: order._id,
    });
  }

  if (status === 'ready_for_pickup') {
    await createAndEmit(io, {
      userId: order.customerId.toString(),
      title: 'Ready for pickup!',
      message: `Your order #${order.orderNumber} is ready — rider will pick it up soon`,
      type: 'order_update',
      orderId: order._id,
    });
    if (order.riderId) {
      await createAndEmit(io, {
        userId: order.riderId.toString(),
        title: 'Order ready for pickup',
        message: `Order #${order.orderNumber} is ready. Go pick it up!`,
        type: 'delivery_update',
        orderId: order._id,
      });
    }
  }

  if (status === 'picked_up') {
    await createAndEmit(io, {
      userId: order.customerId.toString(),
      title: 'Order picked up!',
      message: 'Your rider has picked up your food',
      type: 'delivery_update',
      orderId: order._id,
    });
  }

  if (status === 'on_the_way') {
    await createAndEmit(io, {
      userId: order.customerId.toString(),
      title: 'Rider on the way!',
      message: 'Your rider is heading to your location',
      type: 'delivery_update',
      orderId: order._id,
    });
  }

  if (status === 'delivered') {
    const deliveredAt = new Date();
    const placedAt = order.createdAt;
    order.actualDeliveryTime = Math.round((deliveredAt - placedAt) / 60000);
    await order.save();

    // Rider earnings
    const distanceBonus = Math.round(order.deliveryDistance * 5);
    await RiderEarning.create({
      riderId: order.riderId,
      orderId: order._id,
      distanceBonus,
      totalEarning: 30 + distanceBonus,
      deliveryDistance: order.deliveryDistance,
    });

    // Free up rider
    await User.findByIdAndUpdate(order.riderId, {
      isAvailable: true,
      currentDeliveryId: null,
    });

    await createAndEmit(io, {
      userId: order.customerId.toString(),
      title: 'Order delivered!',
      message: `Your order #${order.orderNumber} has been delivered. Enjoy your meal!`,
      type: 'order_update',
      orderId: order._id,
    });

    const restaurant = await Restaurant.findById(order.restaurantId).lean();
    if (restaurant) {
      await createAndEmit(io, {
        userId: restaurant.ownerId.toString(),
        title: 'Order delivered',
        message: `Order #${order.orderNumber} was successfully delivered`,
        type: 'order_update',
        orderId: order._id,
      });
    }
  }

  const updated = await Order.findById(order._id)
    .populate('restaurantId', 'name coverPhoto')
    .populate('riderId', 'name phone profilePhoto')
    .populate('customerId', 'name phone');

  res.status(200).json({ success: true, data: updated });
});

// ─── Cancel Order ─────────────────────────────────────────────────────────────

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const { userId, role } = req.user;
  const io = req.app.get('io');

  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

  const cancelledStatuses = ['delivered', 'cancelled'];

  if (role === 'customer') {
    if (order.customerId.toString() !== userId) return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
    if (order.status !== 'placed') {
      return next(new AppError('You can only cancel an order while it is still placed', 400, 'CANNOT_CANCEL'));
    }
  } else if (role === 'admin') {
    if (cancelledStatuses.includes(order.status)) {
      return next(new AppError('Order is already completed or cancelled', 400, 'CANNOT_CANCEL'));
    }
  }

  order.status = 'cancelled';
  order.cancellation = {
    cancelledBy: role === 'admin' ? 'admin' : 'customer',
    reason,
    cancelledAt: new Date(),
  };
  order.statusHistory.push({ status: 'cancelled', updatedBy: userId });
  await order.save();

  // Refund if paid by Stripe
  if (order.paymentStatus === 'paid' && order.stripeSessionId) {
    try {
      await createRefund(order.stripeSessionId);
      order.paymentStatus = 'refunded';
      await order.save();
    } catch { /* log silently */ }
  }

  // Free rider if assigned
  if (order.riderId) {
    await User.findByIdAndUpdate(order.riderId, {
      isAvailable: true,
      currentDeliveryId: null,
    });
  }

  if (io) io.to(`order:${order._id}`).emit('order_cancelled', { orderId: order._id, reason });

  await createAndEmit(io, {
    userId: order.customerId.toString(),
    title: 'Order cancelled',
    message: `Your order #${order.orderNumber} has been cancelled. Reason: ${reason}`,
    type: 'order_update',
    orderId: order._id,
  });

  const restaurant = await Restaurant.findById(order.restaurantId).lean();
  if (restaurant) {
    await createAndEmit(io, {
      userId: restaurant.ownerId.toString(),
      title: 'Order cancelled',
      message: `Order #${order.orderNumber} was cancelled`,
      type: 'order_update',
      orderId: order._id,
    });
  }

  res.status(200).json({ success: true, data: order });
});

const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Complaint = require('../models/Complaint');
const Review = require('../models/Review');
const RiderEarning = require('../models/RiderEarning');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { createAndEmit } = require('../services/notificationService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const startOf = (unit) => {
  const d = new Date();
  if (unit === 'day') { d.setHours(0, 0, 0, 0); return d; }
  if (unit === 'week') { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
  if (unit === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

exports.getDashboard = catchAsync(async (req, res, next) => {
  const [
    usersByRole,
    activeRestaurants,
    orderCountToday,
    orderCountWeek,
    orderCountMonth,
    revenueToday,
    revenueWeek,
    revenueMonth,
    activeRiders,
    pendingRestaurants,
    pendingRiders,
    pendingComplaints,
    ordersByStatus,
    revenueLast30Days,
  ] = await Promise.all([
    // Users by role
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),

    // Active approved restaurants (owner not suspended)
    Restaurant.aggregate([
      { $match: { applicationStatus: 'approved' } },
      {
        $lookup: {
          from: 'users',
          localField: 'ownerId',
          foreignField: '_id',
          as: 'owner',
        },
      },
      { $match: { 'owner.isSuspended': { $ne: true } } },
      { $count: 'total' },
    ]),

    // Order counts
    Order.countDocuments({ createdAt: { $gte: startOf('day') } }),
    Order.countDocuments({ createdAt: { $gte: startOf('week') } }),
    Order.countDocuments({ createdAt: { $gte: startOf('month') } }),

    // Revenue (platformFee + commission from delivered orders)
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: startOf('day') } } },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      { $unwind: '$restaurant' },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: {
              $add: [
                '$platformFee',
                { $divide: [{ $multiply: ['$subtotal', '$restaurant.commissionRate'] }, 100] },
              ],
            },
          },
        },
      },
    ]),
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: startOf('week') } } },
      { $lookup: { from: 'restaurants', localField: 'restaurantId', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $group: { _id: null, revenue: { $sum: { $add: ['$platformFee', { $divide: [{ $multiply: ['$subtotal', '$restaurant.commissionRate'] }, 100] }] } } } },
    ]),
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: startOf('month') } } },
      { $lookup: { from: 'restaurants', localField: 'restaurantId', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $group: { _id: null, revenue: { $sum: { $add: ['$platformFee', { $divide: [{ $multiply: ['$subtotal', '$restaurant.commissionRate'] }, 100] }] } } } },
    ]),

    // Active riders
    User.countDocuments({ role: 'rider', isAvailable: true, isSuspended: false }),

    // Pending restaurant applications
    Restaurant.countDocuments({ applicationStatus: 'pending' }),

    // Pending rider applications
    User.countDocuments({ role: 'rider', 'riderProfile.applicationStatus': 'pending' }),

    // Pending complaints
    Complaint.countDocuments({ status: 'pending' }),

    // Orders by status
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

    // Revenue last 30 days
    Order.aggregate([
      { $match: { status: 'delivered', createdAt: { $gte: startOf('month') } } },
      { $lookup: { from: 'restaurants', localField: 'restaurantId', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: {
            $sum: {
              $add: [
                '$platformFee',
                { $divide: [{ $multiply: ['$subtotal', '$restaurant.commissionRate'] }, 100] },
              ],
            },
          },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Reshape usersByRole array to object
  const usersMap = {};
  usersByRole.forEach((r) => { usersMap[r._id] = r.count; });

  res.status(200).json({
    status: 'success',
    data: {
      users: {
        customers: usersMap.customer || 0,
        restaurantOwners: usersMap.restaurant_owner || 0,
        riders: usersMap.rider || 0,
        admins: usersMap.admin || 0,
        total: Object.values(usersMap).reduce((a, b) => a + b, 0),
      },
      restaurants: {
        active: activeRestaurants[0]?.total || 0,
        pendingApplications: pendingRestaurants,
      },
      orders: {
        today: orderCountToday,
        thisWeek: orderCountWeek,
        thisMonth: orderCountMonth,
        byStatus: ordersByStatus,
      },
      revenue: {
        today: Math.round(revenueToday[0]?.revenue || 0),
        thisWeek: Math.round(revenueWeek[0]?.revenue || 0),
        thisMonth: Math.round(revenueMonth[0]?.revenue || 0),
        last30Days: revenueLast30Days,
      },
      riders: {
        activeNow: activeRiders,
        pendingApplications: pendingRiders,
      },
      complaints: { pending: pendingComplaints },
    },
  });
});

// ─── Restaurant applications ──────────────────────────────────────────────────

exports.getRestaurantApplications = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.applicationStatus = req.query.status;
  if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

  const [restaurants, total] = await Promise.all([
    Restaurant.find(filter)
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Restaurant.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: restaurants.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { restaurants },
  });
});

exports.approveRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found', 404));
  if (restaurant.applicationStatus !== 'pending')
    return next(new AppError('Restaurant application is not pending', 400));

  restaurant.applicationStatus = 'approved';
  await restaurant.save({ validateBeforeSave: false });

  const io = req.app.get('io');
  await createAndEmit(io, {
    userId: restaurant.ownerId,
    title: 'Restaurant Approved!',
    message: `Congratulations! Your restaurant "${restaurant.name}" has been approved. You can now start accepting orders.`,
    type: 'system',
  });

  res.status(200).json({ status: 'success', data: { restaurant } });
});

exports.rejectRestaurant = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length < 20)
    return next(new AppError('Rejection reason must be at least 20 characters', 400));

  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found', 404));
  if (restaurant.applicationStatus !== 'pending')
    return next(new AppError('Restaurant application is not pending', 400));

  restaurant.applicationStatus = 'rejected';
  restaurant.rejectionReason = reason.trim();
  await restaurant.save({ validateBeforeSave: false });

  const io = req.app.get('io');
  await createAndEmit(io, {
    userId: restaurant.ownerId,
    title: 'Restaurant Application Rejected',
    message: `Your restaurant application for "${restaurant.name}" was rejected. Reason: ${reason.trim()}`,
    type: 'system',
  });

  res.status(200).json({ status: 'success', data: { restaurant } });
});

// ─── Rider management ─────────────────────────────────────────────────────────

exports.getRiders = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const filter = { role: 'rider' };
  if (req.query.status) filter['riderProfile.applicationStatus'] = req.query.status;

  const [riders, total] = await Promise.all([
    User.find(filter)
      .select('-password -refreshTokenHash -resetOtp -resetOtpExpiry')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: riders.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { riders },
  });
});

exports.approveRider = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ _id: req.params.id, role: 'rider' });
  if (!user) return next(new AppError('Rider not found', 404));
  if (!user.riderProfile) return next(new AppError('Rider has not submitted an application', 400));
  if (user.riderProfile.applicationStatus !== 'pending')
    return next(new AppError('Rider application is not pending', 400));

  await User.updateOne(
    { _id: user._id },
    { $set: { 'riderProfile.applicationStatus': 'approved' } }
  );

  const io = req.app.get('io');
  await createAndEmit(io, {
    userId: user._id,
    title: 'Rider Application Approved!',
    message: 'Congratulations! You are now an approved rider. Toggle your availability to start receiving deliveries.',
    type: 'system',
  });

  res.status(200).json({ status: 'success', message: 'Rider approved successfully' });
});

exports.rejectRider = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length < 20)
    return next(new AppError('Rejection reason must be at least 20 characters', 400));

  const user = await User.findOne({ _id: req.params.id, role: 'rider' });
  if (!user) return next(new AppError('Rider not found', 404));
  if (!user.riderProfile) return next(new AppError('Rider has not submitted an application', 400));

  await User.updateOne(
    { _id: user._id },
    { $set: { 'riderProfile.applicationStatus': 'rejected', 'riderProfile.rejectionReason': reason.trim() } }
  );

  const io = req.app.get('io');
  await createAndEmit(io, {
    userId: user._id,
    title: 'Rider Application Rejected',
    message: `Your rider application was rejected. Reason: ${reason.trim()}`,
    type: 'system',
  });

  res.status(200).json({ status: 'success', message: 'Rider application rejected' });
});

// ─── Customer management ──────────────────────────────────────────────────────

exports.getUsers = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const allowedRoles = ['customer', 'restaurant_owner', 'rider'];
  const role = allowedRoles.includes(req.query.role) ? req.query.role : 'customer';

  const filter = { role };
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -refreshTokenHash -resetOtp -resetOtpExpiry')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { users },
  });
});

exports.getCustomers = exports.getUsers;

// ─── Suspend / unsuspend ──────────────────────────────────────────────────────

exports.suspendUser = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length < 10)
    return next(new AppError('Suspension reason must be at least 10 characters', 400));

  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  if (user.role === 'admin') return next(new AppError('Cannot suspend an admin', 403));
  if (user.isSuspended) return next(new AppError('User is already suspended', 400));

  user.isSuspended = true;
  await user.save({ validateBeforeSave: false });

  const io = req.app.get('io');
  const ops = [];

  if (user.role === 'restaurant_owner') {
    ops.push(Restaurant.updateOne({ ownerId: user._id }, { isOpen: false }));
  }
  if (user.role === 'rider') {
    user.isAvailable = false;
    ops.push(user.save({ validateBeforeSave: false }));
  }
  if (ops.length) await Promise.all(ops);

  await createAndEmit(io, {
    userId: user._id,
    title: 'Account Suspended',
    message: `Your account has been suspended. Reason: ${reason.trim()}`,
    type: 'system',
  });

  res.status(200).json({ status: 'success', message: 'User suspended successfully' });
});

exports.unsuspendUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  if (!user.isSuspended) return next(new AppError('User is not suspended', 400));

  user.isSuspended = false;
  await user.save({ validateBeforeSave: false });

  const io = req.app.get('io');
  await createAndEmit(io, {
    userId: user._id,
    title: 'Account Reinstated',
    message: 'Your account suspension has been lifted. Welcome back!',
    type: 'system',
  });

  res.status(200).json({ status: 'success', message: 'User unsuspended successfully' });
});

// ─── Restaurant suspend / unsuspend (by restaurant ID) ───────────────────────

exports.suspendRestaurant = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason || reason.trim().length < 10)
    return next(new AppError('Suspension reason must be at least 10 characters', 400));

  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found', 404));

  const user = await User.findById(restaurant.ownerId);
  if (!user) return next(new AppError('Owner not found', 404));
  if (user.isSuspended) return next(new AppError('Restaurant owner is already suspended', 400));

  user.isSuspended = true;
  restaurant.isOpen = false;
  await Promise.all([user.save({ validateBeforeSave: false }), restaurant.save({ validateBeforeSave: false })]);

  const io = req.app.get('io');
  await createAndEmit(io, {
    userId: user._id,
    title: 'Restaurant Suspended',
    message: `Your restaurant "${restaurant.name}" has been suspended. Reason: ${reason.trim()}`,
    type: 'system',
  });

  res.status(200).json({ status: 'success', message: 'Restaurant suspended successfully' });
});

exports.unsuspendRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found', 404));

  const user = await User.findById(restaurant.ownerId);
  if (!user) return next(new AppError('Owner not found', 404));
  if (!user.isSuspended) return next(new AppError('Restaurant owner is not suspended', 400));

  user.isSuspended = false;
  await user.save({ validateBeforeSave: false });

  const io = req.app.get('io');
  await createAndEmit(io, {
    userId: user._id,
    title: 'Restaurant Reinstated',
    message: `Your restaurant "${restaurant.name}" suspension has been lifted.`,
    type: 'system',
  });

  res.status(200).json({ status: 'success', message: 'Restaurant unsuspended successfully' });
});

// ─── Coupon deactivation ─────────────────────────────────────────────────────

exports.deactivateCoupon = catchAsync(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!coupon) return next(new AppError('Coupon not found', 404));
  res.status(200).json({ status: 'success', data: { coupon } });
});

// ─── Complaint management ─────────────────────────────────────────────────────

exports.getComplaints = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate('orderId', 'orderNumber total status')
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name')
      .populate('riderId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: complaints.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { complaints },
  });
});

exports.updateComplaint = catchAsync(async (req, res, next) => {
  const { status, adminNote } = req.body;

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return next(new AppError('Complaint not found', 404));

  complaint.status = status;
  if (adminNote) complaint.adminNote = adminNote;
  await complaint.save();

  const io = req.app.get('io');
  await createAndEmit(io, {
    userId: complaint.customerId,
    title: 'Complaint Update',
    message:
      status === 'resolved'
        ? `Your complaint has been resolved. ${adminNote ? `Note: ${adminNote}` : ''}`
        : 'Your complaint is now being reviewed by our team.',
    type: 'complaint_update',
    orderId: complaint.orderId,
  });

  res.status(200).json({ status: 'success', data: { complaint } });
});

// ─── Order management ─────────────────────────────────────────────────────────

exports.getAllOrders = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.restaurantId) filter.restaurantId = req.query.restaurantId;
  if (req.query.search) filter.orderNumber = { $regex: req.query.search, $options: 'i' };
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name')
      .populate('riderId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: orders.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { orders },
  });
});

// ─── Coupon management ────────────────────────────────────────────────────────

exports.createCoupon = catchAsync(async (req, res, next) => {
  const {
    code, discountType, discountValue, minimumOrderAmount,
    maximumDiscountAmount, usageLimit, perUserLimit, validFrom, validUntil,
  } = req.body;

  if (discountType === 'percentage') {
    if (discountValue > 50)
      return next(new AppError('Percentage discount cannot exceed 50%', 400));
    if (!maximumDiscountAmount)
      return next(new AppError('Maximum discount amount is required for percentage discounts', 400));
  }
  if (discountType === 'flat' && discountValue > 5000)
    return next(new AppError('Flat discount cannot exceed ৳5000', 400));

  const coupon = await Coupon.create({
    code: code.toUpperCase().trim(),
    discountType,
    discountValue,
    minimumOrderAmount: minimumOrderAmount || 0,
    maximumDiscountAmount: maximumDiscountAmount || undefined,
    usageLimit: usageLimit || null,
    perUserLimit: perUserLimit || 1,
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
    isActive: true,
  });

  res.status(201).json({ status: 'success', data: { coupon } });
});

exports.getCoupons = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: coupons.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { coupons },
  });
});

exports.updateCoupon = catchAsync(async (req, res, next) => {
  const { code, usedCount, ...updateFields } = req.body; // strip immutable fields

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, updateFields, {
    new: true,
    runValidators: true,
  });
  if (!coupon) return next(new AppError('Coupon not found', 404));

  res.status(200).json({ status: 'success', data: { coupon } });
});

// ─── Review management ────────────────────────────────────────────────────────

exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found', 404));

  await review.deleteOne();

  // Mark order as no longer reviewed
  await Order.findByIdAndUpdate(review.orderId, { isReviewed: false });

  // Recalculate restaurant rating
  const stats = await Review.aggregate([
    { $match: { restaurantId: review.restaurantId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await Restaurant.findByIdAndUpdate(review.restaurantId, {
    averageRating: stats.length ? Math.round(stats[0].avg * 10) / 10 : 0,
    totalReviews: stats.length ? stats[0].count : 0,
  });

  res.status(200).json({ status: 'success', message: 'Review deleted successfully' });
});

// ─── Revenue analytics ────────────────────────────────────────────────────────

exports.getRevenue = catchAsync(async (req, res, next) => {
  const filter = { status: 'delivered' };
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [summary, dailyChart] = await Promise.all([
    Order.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      { $unwind: '$restaurant' },
      {
        $group: {
          _id: null,
          totalPlatformFees: { $sum: '$platformFee' },
          totalCommissions: {
            $sum: { $divide: [{ $multiply: ['$subtotal', '$restaurant.commissionRate'] }, 100] },
          },
          totalStripeOrders: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'stripe'] }, 1, 0] },
          },
          totalCodOrders: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'cod'] }, 1, 0] },
          },
          totalRefunds: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'refunded'] }, '$total', 0] },
          },
          totalOrders: { $sum: 1 },
          totalOrderValue: { $sum: '$total' },
        },
      },
    ]),
    Order.aggregate([
      { $match: filter },
      { $lookup: { from: 'restaurants', localField: 'restaurantId', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          platformFees: { $sum: '$platformFee' },
          commissions: {
            $sum: { $divide: [{ $multiply: ['$subtotal', '$restaurant.commissionRate'] }, 100] },
          },
          orders: { $sum: 1 },
        },
      },
      {
        $addFields: {
          totalRevenue: { $add: ['$platformFees', '$commissions'] },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const s = summary[0] || {};
  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalPlatformFees: Math.round(s.totalPlatformFees || 0),
        totalCommissions: Math.round(s.totalCommissions || 0),
        totalRevenue: Math.round((s.totalPlatformFees || 0) + (s.totalCommissions || 0)),
        totalStripeOrders: s.totalStripeOrders || 0,
        totalCodOrders: s.totalCodOrders || 0,
        totalRefunds: Math.round(s.totalRefunds || 0),
        totalOrders: s.totalOrders || 0,
        totalOrderValue: Math.round(s.totalOrderValue || 0),
      },
      dailyChart,
    },
  });
});

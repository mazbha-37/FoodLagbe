const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const RiderEarning = require('../models/RiderEarning');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { uploadImage } = require('../services/cloudinaryService');

// ─── Get my rider profile ────────────────────────────────────────────────────

exports.getMyRider = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.userId)
    .select('name email phone profilePhoto riderProfile isAvailable currentDeliveryId')
    .lean();

  if (!user) return next(new AppError('User not found', 404));

  if (!user.riderProfile) {
    return res.status(200).json({ status: 'success', data: { rider: null } });
  }

  res.status(200).json({
    status: 'success',
    data: {
      rider: {
        ...user.riderProfile,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        isAvailable: user.isAvailable,
        currentDeliveryId: user.currentDeliveryId,
      },
    },
  });
});

// ─── Get active delivery ─────────────────────────────────────────────────────

exports.getActiveDelivery = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    riderId: req.user.userId,
    status: { $in: ['accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way'] },
  })
    .populate('restaurantId', 'name address phone location coverPhoto')
    .populate('customerId', 'name phone')
    .lean();

  res.status(200).json({ status: 'success', data: { order } });
});

// ─── Apply as rider ───────────────────────────────────────────────────────────

exports.applyAsRider = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.userId);

  if (user.riderProfile && user.riderProfile.applicationStatus === 'pending')
    return next(new AppError('Your application is already pending review', 400));
  if (user.riderProfile && user.riderProfile.applicationStatus === 'approved')
    return next(new AppError('You are already an approved rider', 400));

  // Require nidPhoto + vehicleRegPhoto (bicycle doesn't need vehicleRegPhoto)
  const files = req.files || {};
  if (!files.nidPhoto || !files.nidPhoto[0])
    return next(new AppError('NID photo is required', 400));

  const [nidPhotoResult, profilePhotoResult] = await Promise.all([
    uploadImage(files.nidPhoto[0].buffer, 'riders/nid'),
    files.profilePhoto && files.profilePhoto[0]
      ? uploadImage(files.profilePhoto[0].buffer, 'riders/profiles')
      : Promise.resolve(null),
  ]);

  let vehicleRegPhotoResult = null;
  if (req.body.vehicleType !== 'bicycle') {
    if (!files.vehicleRegPhoto || !files.vehicleRegPhoto[0])
      return next(new AppError('Vehicle registration photo is required for motorcycle/car', 400));
    vehicleRegPhotoResult = await uploadImage(files.vehicleRegPhoto[0].buffer, 'riders/vehicle-reg');
  }

  const updateData = {
    riderProfile: {
      nidNumber: req.body.nidNumber,
      nidPhoto: nidPhotoResult,
      vehicleType: req.body.vehicleType,
      vehicleRegNumber: req.body.vehicleRegNumber || undefined,
      vehicleRegPhoto: vehicleRegPhotoResult || undefined,
      applicationStatus: 'pending',
    },
  };

  if (profilePhotoResult) updateData.profilePhoto = profilePhotoResult;

  await User.updateOne({ _id: user._id }, { $set: updateData });

  res.status(200).json({
    status: 'success',
    message: 'Application submitted successfully. You will be notified once reviewed.',
    data: { applicationStatus: 'pending' },
  });
});

// ─── Toggle availability ──────────────────────────────────────────────────────

exports.toggleAvailability = catchAsync(async (req, res, next) => {
  const mongoose = require('mongoose');
  const col = mongoose.connection.collection('users');

  const user = await col.findOne(
    { _id: new mongoose.Types.ObjectId(req.user.userId) },
    { projection: { riderProfile: 1, isAvailable: 1, currentDeliveryId: 1 } }
  );

  if (!user) return next(new AppError('User not found', 404));

  if (!user.riderProfile || user.riderProfile.applicationStatus !== 'approved')
    return next(new AppError('Only approved riders can toggle availability', 403));

  if (user.currentDeliveryId)
    return next(new AppError('Cannot change availability while on an active delivery', 400));

  const newAvailability = !user.isAvailable;

  // Raw MongoDB update — bypasses Mongoose and any index issues
  await col.updateOne(
    { _id: user._id },
    { $set: { isAvailable: newAvailability } }
  );

  // When rider goes available, try to assign any unassigned orders
  if (newAvailability) {
    try {
      const io = req.app.get('io');
      const Restaurant = require('../models/Restaurant');
      const unassignedOrder = await Order.findOne({
        riderId: null,
        status: { $in: ['accepted', 'preparing', 'ready_for_pickup'] },
      }).lean();

      if (unassignedOrder) {
        const restaurant = await Restaurant.findById(unassignedOrder.restaurantId).select('location').lean();

        // Assign this rider directly
        await col.updateOne(
          { _id: user._id },
          { $set: { isAvailable: false, currentDeliveryId: unassignedOrder._id } }
        );
        await Order.findByIdAndUpdate(unassignedOrder._id, { riderId: user._id });

        // Notify rider
        const { createAndEmit } = require('../services/notificationService');
        await createAndEmit(io, {
          userId: user._id.toString(),
          title: 'New delivery request',
          message: `Order #${unassignedOrder.orderNumber} has been assigned to you`,
          type: 'delivery_update',
          orderId: unassignedOrder._id,
        });

        // Notify customer
        const riderDoc = await col.findOne({ _id: user._id }, { projection: { name: 1, phone: 1 } });
        await createAndEmit(io, {
          userId: unassignedOrder.customerId.toString(),
          title: 'Rider assigned',
          message: `${riderDoc?.name || 'A rider'} is heading to the restaurant`,
          type: 'delivery_update',
          orderId: unassignedOrder._id,
        });

        return res.status(200).json({
          status: 'success',
          data: { isAvailable: false },
          message: `You have been assigned to order #${unassignedOrder.orderNumber}`,
        });
      }
    } catch (err) {
      console.error('Auto-assign on toggle error:', err.message);
    }
  }

  res.status(200).json({
    status: 'success',
    data: { isAvailable: newAvailability },
  });
});

// ─── Update rider location (HTTP fallback) ────────────────────────────────────

exports.updateRiderLocation = catchAsync(async (req, res, next) => {
  const { latitude, longitude } = req.body;

  await User.findByIdAndUpdate(req.user.userId, {
    'currentLocation.coordinates': [parseFloat(longitude), parseFloat(latitude)],
  });

  res.status(200).json({ status: 'success', message: 'Location updated' });
});

// ─── Get rider earnings ───────────────────────────────────────────────────────

exports.getRiderEarnings = catchAsync(async (req, res, next) => {
  const period = req.query.period || 'weekly';
  const now = new Date();
  let startDate;

  if (period === 'daily') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // weekly — last 7 days
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
  }

  const riderId = new mongoose.Types.ObjectId(req.user.userId);
  const [summary, chartData] = await Promise.all([
    RiderEarning.aggregate([
      { $match: { riderId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalEarning' },
          totalDeliveries: { $sum: 1 },
        },
      },
    ]),
    RiderEarning.aggregate([
      { $match: { riderId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          earnings: { $sum: '$totalEarning' },
          deliveries: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalEarnings = summary[0]?.totalEarnings || 0;
  const totalDeliveries = summary[0]?.totalDeliveries || 0;

  res.status(200).json({
    status: 'success',
    data: {
      period,
      totalEarnings,
      totalDeliveries,
      averagePerDelivery: totalDeliveries ? Math.round(totalEarnings / totalDeliveries) : 0,
      chartData,
    },
  });
});

// ─── Get delivery history ─────────────────────────────────────────────────────

exports.getDeliveryHistory = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find({ riderId: req.user.userId, status: 'delivered' })
      .select('orderNumber restaurantId customerId deliveryAddress total deliveryFee deliveryDistance status createdAt actualDeliveryTime')
      .populate('restaurantId', 'name address')
      .populate('customerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments({ riderId: req.user.userId, status: 'delivered' }),
  ]);

  res.status(200).json({
    status: 'success',
    results: orders.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { orders },
  });
});

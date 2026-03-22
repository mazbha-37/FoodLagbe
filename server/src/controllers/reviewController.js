const Review = require('../models/Review');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { uploadImage } = require('../services/cloudinaryService');

// ─── Create review for a delivered order ──────────────────────────────────────

exports.createReview = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const customerId = req.user.userId;

  const order = await Order.findById(orderId);
  if (!order) return next(new AppError('Order not found', 404));
  if (!order.customerId.equals(customerId))
    return next(new AppError('Not authorized to review this order', 403));
  if (order.status !== 'delivered')
    return next(new AppError('You can only review delivered orders', 400));
  if (order.isReviewed) return next(new AppError('You have already reviewed this order', 400));

  // Upload review images (max 3, optional)
  const images = [];
  if (req.files && req.files.length) {
    for (const file of req.files) {
      const result = await uploadImage(file.buffer, 'reviews');
      images.push(result);
    }
  }

  const review = await Review.create({
    orderId,
    customerId,
    restaurantId: order.restaurantId,
    rating: req.body.rating,
    comment: req.body.comment,
    images,
  });

  order.isReviewed = true;
  await order.save({ validateBeforeSave: false });

  // Recalculate restaurant average rating
  const stats = await Review.aggregate([
    { $match: { restaurantId: order.restaurantId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length) {
    await Restaurant.findByIdAndUpdate(order.restaurantId, {
      averageRating: Math.round(stats[0].avg * 10) / 10,
      totalReviews: stats[0].count,
    });
  }

  res.status(201).json({ status: 'success', data: { review } });
});

// ─── Get paginated reviews for a restaurant ───────────────────────────────────

exports.getRestaurantReviews = catchAsync(async (req, res, next) => {
  const { restaurantId } = req.params;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const sortMap = {
    recent: { createdAt: -1 },
    highest: { rating: -1 },
    lowest: { rating: 1 },
  };
  const sortObj = sortMap[req.query.sort] || sortMap.recent;

  const [reviews, total] = await Promise.all([
    Review.find({ restaurantId })
      .populate('customerId', 'name profilePhoto')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments({ restaurantId }),
  ]);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { reviews },
  });
});

// ─── Get current customer's own reviews ───────────────────────────────────────

exports.getMyReviews = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    Review.find({ customerId: req.user.userId })
      .populate('restaurantId', 'name coverPhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments({ customerId: req.user.userId }),
  ]);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { reviews },
  });
});

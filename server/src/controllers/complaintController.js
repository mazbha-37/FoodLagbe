const Complaint = require('../models/Complaint');
const Order = require('../models/Order');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ─── File a complaint (customer) ──────────────────────────────────────────────

exports.fileComplaint = catchAsync(async (req, res, next) => {
  const { orderId, subject, description } = req.body;
  const customerId = req.user.userId;

  const order = await Order.findById(orderId);
  if (!order) return next(new AppError('Order not found', 404));
  if (!order.customerId.equals(customerId))
    return next(new AppError('Not authorized to file a complaint for this order', 403));
  if (order.status !== 'delivered')
    return next(new AppError('You can only file complaints for delivered orders', 400));

  const existing = await Complaint.findOne({ orderId });
  if (existing) return next(new AppError('A complaint has already been filed for this order', 400));

  const complaint = await Complaint.create({
    orderId,
    customerId,
    restaurantId: order.restaurantId,
    riderId: order.riderId || undefined,
    subject,
    description,
  });

  res.status(201).json({ status: 'success', data: { complaint } });
});

// ─── Get a single complaint ───────────────────────────────────────────────────

exports.getComplaint = catchAsync(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('orderId', 'orderNumber total status')
    .populate('customerId', 'name email phone')
    .populate('restaurantId', 'name')
    .populate('riderId', 'name phone')
    .lean();

  if (!complaint) return next(new AppError('Complaint not found', 404));

  // Customers can only see their own complaints
  if (req.user.role === 'customer' && complaint.customerId._id.toString() !== req.user.userId)
    return next(new AppError('Not authorized', 403));

  res.status(200).json({ status: 'success', data: { complaint } });
});

// ─── Get current customer's complaints ───────────────────────────────────────

exports.getMyComplaints = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const [complaints, total] = await Promise.all([
    Complaint.find({ customerId: req.user.userId })
      .populate('orderId', 'orderNumber total status')
      .populate('restaurantId', 'name coverPhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Complaint.countDocuments({ customerId: req.user.userId }),
  ]);

  res.status(200).json({
    status: 'success',
    results: complaints.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { complaints },
  });
});

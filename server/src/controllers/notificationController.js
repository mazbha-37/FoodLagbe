const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// ─── Get paginated notifications for current user ─────────────────────────────

exports.getNotifications = catchAsync(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId: req.user.userId }),
  ]);

  res.status(200).json({
    status: 'success',
    results: notifications.length,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    data: { notifications },
  });
});

// ─── Mark a single notification as read ──────────────────────────────────────

exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) return next(new AppError('Notification not found', 404));

  res.status(200).json({ status: 'success', data: { notification } });
});

// ─── Mark all notifications as read ──────────────────────────────────────────

exports.markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany({ userId: req.user.userId, isRead: false }, { isRead: true });

  res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
});

// ─── Get unread notification count ───────────────────────────────────────────

exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const count = await Notification.countDocuments({ userId: req.user.userId, isRead: false });

  res.status(200).json({ status: 'success', data: { count } });
});

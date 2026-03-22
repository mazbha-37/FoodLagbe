const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { uploadImage, deleteImage } = require('../services/cloudinaryService');

// ─── Get my profile ──────────────────────────────────────────────────────────

exports.getMyProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.userId)
    .select('name email phone profilePhoto savedAddresses lastUsedAddress role')
    .lean();

  if (!user) return next(new AppError('User not found', 404));

  res.status(200).json({ status: 'success', data: user });
});

// ─── Update my profile ───────────────────────────────────────────────────────

exports.updateProfile = catchAsync(async (req, res, next) => {
  const allowedFields = ['name', 'phone'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  if (req.file) {
    const user = await User.findById(req.user.userId).select('profilePhoto').lean();
    if (user?.profilePhoto?.publicId) {
      await deleteImage(user.profilePhoto.publicId);
    }
    updates.profilePhoto = await uploadImage(req.file.buffer, 'profiles');
  }

  const user = await User.findByIdAndUpdate(req.user.userId, updates, {
    new: true,
    runValidators: true,
  }).select('name email phone profilePhoto savedAddresses lastUsedAddress role');

  if (!user) return next(new AppError('User not found', 404));

  res.status(200).json({ status: 'success', data: user });
});

// ─── Add address ─────────────────────────────────────────────────────────────

exports.addAddress = catchAsync(async (req, res, next) => {
  const { label, address, latitude, longitude } = req.body;

  const user = await User.findById(req.user.userId);
  if (!user) return next(new AppError('User not found', 404));

  if (user.savedAddresses.length >= 5) {
    return next(new AppError('You can save at most 5 addresses', 400));
  }

  user.savedAddresses.push({ label, address, latitude, longitude });
  await user.save({ validateBeforeSave: false });

  res.status(201).json({ status: 'success', data: { addresses: user.savedAddresses } });
});

// ─── Update address ──────────────────────────────────────────────────────────

exports.updateAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.userId);
  if (!user) return next(new AppError('User not found', 404));

  const addr = user.savedAddresses.id(req.params.id);
  if (!addr) return next(new AppError('Address not found', 404));

  const { label, address, latitude, longitude } = req.body;
  if (label !== undefined) addr.label = label;
  if (address !== undefined) addr.address = address;
  if (latitude !== undefined) addr.latitude = latitude;
  if (longitude !== undefined) addr.longitude = longitude;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', data: { addresses: user.savedAddresses } });
});

// ─── Delete address ──────────────────────────────────────────────────────────

exports.deleteAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.userId);
  if (!user) return next(new AppError('User not found', 404));

  const addr = user.savedAddresses.id(req.params.id);
  if (!addr) return next(new AppError('Address not found', 404));

  addr.deleteOne();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', data: { addresses: user.savedAddresses } });
});

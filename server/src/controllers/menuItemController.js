const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { uploadImage, deleteImage } = require('../services/cloudinaryService');

const verifyOwnership = async (restaurantId, userId, next) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return next(new AppError('Restaurant not found', 404, 'NOT_FOUND'));
  if (restaurant.ownerId.toString() !== userId) {
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  }
  return restaurant;
};

exports.getMenuItems = catchAsync(async (req, res, next) => {
  const items = await MenuItem.find({
    restaurantId: req.params.restaurantId,
    categoryId: req.params.catId,
    isDeleted: false,
  }).sort({ sortOrder: 1, name: 1 });

  res.status(200).json({ success: true, data: items });
});

exports.createMenuItem = catchAsync(async (req, res, next) => {
  const restaurant = await verifyOwnership(req.params.restaurantId, req.user.userId, next);
  if (!restaurant) return;

  if (!req.file) {
    return next(new AppError('Menu item photo is required', 400, 'MISSING_PHOTO'));
  }

  const photo = await uploadImage(req.file.buffer, 'menu-items');

  const item = await MenuItem.create({
    restaurantId: req.params.restaurantId,
    categoryId: req.params.catId,
    name: req.body.name,
    description: req.body.description || '',
    price: req.body.price,
    photo,
    isAvailable: req.body.isAvailable ?? true,
    sortOrder: req.body.sortOrder ?? 0,
  });

  res.status(201).json({ success: true, data: item });
});

exports.updateMenuItem = catchAsync(async (req, res, next) => {
  const restaurant = await verifyOwnership(req.params.restaurantId, req.user.userId, next);
  if (!restaurant) return;

  const item = await MenuItem.findOne({
    _id: req.params.itemId,
    restaurantId: req.params.restaurantId,
    isDeleted: false,
  });
  if (!item) return next(new AppError('Menu item not found', 404, 'NOT_FOUND'));

  const updates = { ...req.body };

  if (req.file) {
    await deleteImage(item.photo.publicId);
    updates.photo = await uploadImage(req.file.buffer, 'menu-items');
  }

  const updated = await MenuItem.findByIdAndUpdate(req.params.itemId, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: updated });
});

exports.deleteMenuItem = catchAsync(async (req, res, next) => {
  const restaurant = await verifyOwnership(req.params.restaurantId, req.user.userId, next);
  if (!restaurant) return;

  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.itemId, restaurantId: req.params.restaurantId, isDeleted: false },
    { isDeleted: true, isAvailable: false },
    { new: true }
  );
  if (!item) return next(new AppError('Menu item not found', 404, 'NOT_FOUND'));

  res.status(200).json({ success: true, message: 'Menu item deleted' });
});

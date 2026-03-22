const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const verifyOwnership = async (restaurantId, userId, next) => {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return next(new AppError('Restaurant not found', 404, 'NOT_FOUND'));
  if (restaurant.ownerId.toString() !== userId) {
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  }
  return restaurant;
};

exports.getCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find({ restaurantId: req.params.restaurantId })
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  // Enrich each category with its menu items
  const enriched = await Promise.all(
    categories.map(async (cat) => {
      const items = await MenuItem.find({
        restaurantId: req.params.restaurantId,
        categoryId: cat._id,
        isDeleted: false,
      }).sort({ sortOrder: 1, name: 1 }).lean();
      return { ...cat, items };
    })
  );

  res.status(200).json({ success: true, data: enriched });
});

exports.createCategory = catchAsync(async (req, res, next) => {
  const restaurant = await verifyOwnership(req.params.restaurantId, req.user.userId, next);
  if (!restaurant) return;

  const existing = await Category.findOne({
    restaurantId: req.params.restaurantId,
    name: { $regex: `^${req.body.name}$`, $options: 'i' },
  });
  if (existing) {
    return next(new AppError('A category with this name already exists', 409, 'DUPLICATE_CATEGORY'));
  }

  const category = await Category.create({
    restaurantId: req.params.restaurantId,
    name: req.body.name,
    sortOrder: req.body.sortOrder ?? 0,
  });

  res.status(201).json({ success: true, data: category });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  const restaurant = await verifyOwnership(req.params.restaurantId, req.user.userId, next);
  if (!restaurant) return;

  const category = await Category.findOneAndUpdate(
    { _id: req.params.catId, restaurantId: req.params.restaurantId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!category) return next(new AppError('Category not found', 404, 'NOT_FOUND'));

  res.status(200).json({ success: true, data: category });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
  const restaurant = await verifyOwnership(req.params.restaurantId, req.user.userId, next);
  if (!restaurant) return;

  const itemCount = await MenuItem.countDocuments({
    categoryId: req.params.catId,
    isDeleted: false,
  });
  if (itemCount > 0) {
    return next(
      new AppError(
        `Cannot delete category with ${itemCount} active menu item(s). Move or delete them first.`,
        400,
        'CATEGORY_HAS_ITEMS'
      )
    );
  }

  const category = await Category.findOneAndDelete({
    _id: req.params.catId,
    restaurantId: req.params.restaurantId,
  });
  if (!category) return next(new AppError('Category not found', 404, 'NOT_FOUND'));

  res.status(200).json({ success: true, message: 'Category deleted' });
});

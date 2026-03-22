const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { uploadImage, deleteImage } = require('../services/cloudinaryService');
const { calculateDeliveryFee } = require('../services/deliveryFeeCalculator');
const haversine = require('../utils/haversine');

// ─── Create Restaurant ───────────────────────────────────────────────────────

exports.createRestaurant = catchAsync(async (req, res, next) => {
  const existing = await Restaurant.findOne({ ownerId: req.user.userId });
  if (existing) {
    return next(new AppError('You already have a restaurant registered', 409, 'RESTAURANT_EXISTS'));
  }

  const coverFile = req.files?.coverPhoto?.[0];
  const licenseFile = req.files?.tradeLicensePhoto?.[0];
  if (!coverFile || !licenseFile) {
    return next(new AppError('Both coverPhoto and tradeLicensePhoto are required', 400, 'MISSING_FILES'));
  }

  const [coverPhoto, tradeLicensePhoto] = await Promise.all([
    uploadImage(coverFile.buffer, 'restaurants'),
    uploadImage(licenseFile.buffer, 'restaurants'),
  ]);

  const {
    restaurantName, description, address, latitude, longitude,
    phone, cuisineTypes, openingHours, estimatedPrepTime,
  } = req.body;

  const restaurant = await Restaurant.create({
    ownerId: req.user.userId,
    name: restaurantName,
    description,
    address,
    location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
    phone,
    cuisineTypes: Array.isArray(cuisineTypes) ? cuisineTypes : JSON.parse(cuisineTypes),
    openingHours: Array.isArray(openingHours) ? openingHours : JSON.parse(openingHours),
    estimatedPrepTime: parseInt(estimatedPrepTime),
    coverPhoto,
    tradeLicensePhoto,
    applicationStatus: 'pending',
  });

  res.status(201).json({ success: true, data: restaurant });
});

// ─── Get Restaurants (public, geo-filtered) ──────────────────────────────────

exports.getRestaurants = catchAsync(async (req, res, next) => {
  const {
    lat, lng,
    radius = 5,
    page = 1,
    limit = 20,
    cuisine,
    sort = 'distance',
    search,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const filter = { applicationStatus: 'approved' };

  // Geo filter
  if (lat && lng) {
    const radiusKm = parseFloat(radius);
    filter.location = {
      $geoWithin: {
        $centerSphere: [[parseFloat(lng), parseFloat(lat)], radiusKm / 6371],
      },
    };
  }

  // Cuisine filter
  if (cuisine) {
    filter.cuisineTypes = { $in: cuisine.split(',').map((c) => c.trim()) };
  }

  // Text search
  if (search) {
    const menuRestaurantIds = await MenuItem.distinct('restaurantId', {
      name: { $regex: search, $options: 'i' },
      isDeleted: false,
    });
    filter.$or = [
      { $text: { $search: search } },
      { _id: { $in: menuRestaurantIds } },
    ];
  }

  const restaurants = await Restaurant.find(filter).lean();

  // Enrich with delivery info
  const userPoint = lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : null;

  const enriched = restaurants.map((r) => {
    const [rLng, rLat] = r.location.coordinates;
    const distanceKm = userPoint
      ? haversine(userPoint, { latitude: rLat, longitude: rLng })
      : null;
    const deliveryFee = distanceKm !== null ? calculateDeliveryFee(distanceKm) : null;
    const estimatedDeliveryTime = distanceKm !== null
      ? Math.round(r.estimatedPrepTime + distanceKm * 5)
      : null;
    return { ...r, distanceKm, deliveryFee, estimatedDeliveryTime };
  });

  // Sort
  const sorted = enriched.sort((a, b) => {
    if (sort === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
    if (sort === 'deliveryTime') return (a.estimatedDeliveryTime || 0) - (b.estimatedDeliveryTime || 0);
    if (sort === 'deliveryFee') return (a.deliveryFee || 0) - (b.deliveryFee || 0);
    // distance (default)
    return (a.distanceKm || 0) - (b.distanceKm || 0);
  });

  const total = sorted.length;
  const paginated = sorted.slice(skip, skip + limitNum);

  res.status(200).json({
    success: true,
    results: paginated,
    currentPage: pageNum,
    totalPages: Math.ceil(total / limitNum),
    totalResults: total,
  });
});

// ─── Get Restaurant By ID ────────────────────────────────────────────────────

exports.getRestaurantById = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({
    _id: req.params.id,
    applicationStatus: 'approved',
  }).lean();

  if (!restaurant) {
    return next(new AppError('Restaurant not found', 404, 'NOT_FOUND'));
  }

  // Enrich with delivery info
  const { lat, lng } = req.query;
  if (lat && lng) {
    const [rLng, rLat] = restaurant.location.coordinates;
    const distanceKm = haversine(
      { latitude: parseFloat(lat), longitude: parseFloat(lng) },
      { latitude: rLat, longitude: rLng }
    );
    restaurant.deliveryFee = calculateDeliveryFee(distanceKm);
    restaurant.estimatedDeliveryTime = Math.round(restaurant.estimatedPrepTime + distanceKm * 5);
    restaurant.distanceKm = distanceKm;
  }

  // Build nested menu
  const categories = await Category.find({ restaurantId: restaurant._id })
    .sort({ sortOrder: 1 })
    .lean();

  const categoriesWithItems = await Promise.all(
    categories.map(async (cat) => {
      const items = await MenuItem.find({
        restaurantId: restaurant._id,
        categoryId: cat._id,
        isDeleted: false,
      })
        .sort({ sortOrder: 1 })
        .lean();
      return { ...cat, items };
    })
  );

  res.status(200).json({
    success: true,
    data: { ...restaurant, menu: categoriesWithItems },
  });
});

// ─── Update Restaurant ───────────────────────────────────────────────────────

exports.updateRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found', 404, 'NOT_FOUND'));
  if (restaurant.ownerId.toString() !== req.user.userId) {
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  }

  const updates = {};
  const allowed = ['description', 'address', 'phone', 'cuisineTypes', 'openingHours', 'estimatedPrepTime'];
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (req.body.restaurantName) updates.name = req.body.restaurantName;
  if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
    updates.location = {
      type: 'Point',
      coordinates: [parseFloat(req.body.longitude), parseFloat(req.body.latitude)],
    };
  }

  // New cover photo
  if (req.file) {
    await deleteImage(restaurant.coverPhoto.publicId);
    updates.coverPhoto = await uploadImage(req.file.buffer, 'restaurants');
  }

  const updated = await Restaurant.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: updated });
});

// ─── Toggle Open/Closed ──────────────────────────────────────────────────────

exports.toggleRestaurantStatus = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found', 404, 'NOT_FOUND'));
  if (restaurant.ownerId.toString() !== req.user.userId) {
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  }

  const willOpen = !restaurant.isOpen;

  if (willOpen && restaurant.openingHours?.length) {
    const now = new Date();
    const todayDay = now.getDay();
    const todayHours = restaurant.openingHours.find((h) => h.day === todayDay);

    if (!todayHours?.isOpen) {
      return next(new AppError('Outside scheduled hours', 400, 'OUTSIDE_HOURS'));
    }

    const [openH, openM] = todayHours.openTime.split(':').map(Number);
    const [closeH, closeM] = todayHours.closeTime.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (currentMinutes < openMinutes || currentMinutes > closeMinutes) {
      return next(new AppError('Outside scheduled hours', 400, 'OUTSIDE_HOURS'));
    }
  }

  restaurant.isOpen = willOpen;
  await restaurant.save();

  res.status(200).json({ success: true, isOpen: restaurant.isOpen });
});

// ─── My Restaurant ───────────────────────────────────────────────────────────

exports.getMyRestaurant = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({ ownerId: req.user.userId });
  if (!restaurant) return next(new AppError('You have not registered a restaurant yet', 404, 'NOT_FOUND'));
  res.status(200).json({ success: true, data: restaurant });
});

// ─── Earnings ────────────────────────────────────────────────────────────────

exports.getRestaurantEarnings = catchAsync(async (req, res, next) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) return next(new AppError('Restaurant not found', 404, 'NOT_FOUND'));
  if (restaurant.ownerId.toString() !== req.user.userId) {
    return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
  }

  const { period = 'weekly' } = req.query;
  const now = new Date();
  let startDate;
  let groupFormat;

  if (period === 'daily') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    groupFormat = '%H:00';
  } else if (period === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    groupFormat = '%Y-%m-%d';
  } else {
    // weekly
    const dayOfWeek = now.getDay();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);
    groupFormat = '%Y-%m-%d';
  }

  const [summary] = await Order.aggregate([
    {
      $match: {
        restaurantId: restaurant._id,
        status: 'delivered',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$subtotal' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$subtotal' },
      },
    },
  ]);

  const chartData = await Order.aggregate([
    {
      $match: {
        restaurantId: restaurant._id,
        status: 'delivered',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
        revenue: { $sum: '$subtotal' },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, label: '$_id', revenue: 1 } },
  ]);

  const totalRevenue = summary?.totalRevenue || 0;
  const commissionDeducted = parseFloat(
    ((totalRevenue * restaurant.commissionRate) / 100).toFixed(2)
  );

  res.status(200).json({
    success: true,
    data: {
      totalRevenue,
      totalOrders: summary?.totalOrders || 0,
      averageOrderValue: parseFloat((summary?.averageOrderValue || 0).toFixed(2)),
      commissionDeducted,
      netRevenue: parseFloat((totalRevenue - commissionDeducted).toFixed(2)),
      chartData,
    },
  });
});

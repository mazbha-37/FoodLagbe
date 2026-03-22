const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Shared validation logic — used by controller and order placement
const validateCoupon = async (code, restaurantId, subtotal, customerId) => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw new AppError('Invalid coupon code', 404, 'COUPON_NOT_FOUND');

  if (!coupon.isActive) throw new AppError('This coupon is no longer active', 400, 'COUPON_INACTIVE');

  const now = new Date();
  if (now < coupon.validFrom) throw new AppError('This coupon is not yet valid', 400, 'COUPON_NOT_YET_VALID');
  if (now > coupon.validUntil) throw new AppError('This coupon has expired', 400, 'COUPON_EXPIRED');

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError('This coupon has reached its usage limit', 400, 'COUPON_LIMIT_REACHED');
  }

  if (customerId) {
    const userUsageCount = await Order.countDocuments({ couponId: coupon._id, customerId });
    if (userUsageCount >= coupon.perUserLimit) {
      throw new AppError('You have already used this coupon the maximum number of times', 400, 'COUPON_USER_LIMIT');
    }
  }

  if (subtotal < coupon.minimumOrderAmount) {
    throw new AppError(
      `Minimum order of ৳${coupon.minimumOrderAmount} required for this coupon`,
      400,
      'COUPON_MIN_ORDER'
    );
  }

  if (coupon.applicableRestaurants.length > 0) {
    const applicable = coupon.applicableRestaurants.map((id) => id.toString());
    if (!applicable.includes(restaurantId.toString())) {
      throw new AppError('This coupon is not valid for this restaurant', 400, 'COUPON_RESTAURANT_MISMATCH');
    }
  }

  let discount;
  if (coupon.discountType === 'percentage') {
    const raw = (subtotal * coupon.discountValue) / 100;
    discount = coupon.maximumDiscountAmount
      ? Math.min(raw, coupon.maximumDiscountAmount)
      : raw;
  } else {
    discount = Math.min(coupon.discountValue, subtotal);
  }
  discount = Math.round(discount * 100) / 100;

  return { coupon, discount };
};

exports.validateCoupon = validateCoupon; // exported for use in orderController

exports.applyCoupon = catchAsync(async (req, res, next) => {
  const { code, restaurantId, subtotal } = req.body;

  const { coupon, discount } = await validateCoupon(code, restaurantId, subtotal, req.user.userId);

  res.status(200).json({
    success: true,
    data: {
      valid: true,
      discount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      couponCode: coupon.code,
    },
  });
});

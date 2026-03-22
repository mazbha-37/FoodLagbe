const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ─── Helper: compute subtotal from populated cart ────────────────────────────

const computeSubtotal = (items) =>
  items.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);

// ─── Get Cart ─────────────────────────────────────────────────────────────────

exports.getCart = catchAsync(async (req, res, next) => {
  const cart = await Cart.findOne({ customerId: req.user.userId })
    .populate('items.menuItemId', 'name price photo isAvailable isDeleted')
    .populate('restaurantId', 'name coverPhoto');

  if (!cart) {
    return res.status(200).json({ success: true, data: { items: [], restaurantId: null, subtotal: 0 } });
  }

  // Clean up stale items
  const beforeCount = cart.items.length;
  cart.items = cart.items.filter(
    (item) => item.menuItemId && !item.menuItemId.isDeleted
  );
  const cleaned = beforeCount - cart.items.length;

  if (cleaned > 0) {
    if (cart.items.length === 0) {
      await Cart.findByIdAndDelete(cart._id);
      return res.status(200).json({
        success: true,
        data: { items: [], restaurantId: null, subtotal: 0 },
        message: `${cleaned} unavailable item(s) were removed from your cart`,
      });
    }
    await cart.save();
  }

  const data = cart.toObject();
  data.subtotal = computeSubtotal(cart.items);

  const response = { success: true, data };
  if (cleaned > 0) response.message = `${cleaned} unavailable item(s) were removed from your cart`;

  res.status(200).json(response);
});

// ─── Add To Cart ──────────────────────────────────────────────────────────────

exports.addToCart = catchAsync(async (req, res, next) => {
  const { menuItemId, quantity = 1, specialInstructions = '' } = req.body;

  // Validate item
  const menuItem = await MenuItem.findOne({ _id: menuItemId, isDeleted: false });
  if (!menuItem) return next(new AppError('Menu item not found', 404, 'NOT_FOUND'));
  if (!menuItem.isAvailable) return next(new AppError('This item is currently unavailable', 400, 'ITEM_UNAVAILABLE'));

  // Validate restaurant
  const restaurant = await Restaurant.findOne({ _id: menuItem.restaurantId, applicationStatus: 'approved' });
  if (!restaurant) return next(new AppError('Restaurant not available', 400, 'RESTAURANT_UNAVAILABLE'));

  const customerId = req.user.userId;
  let cart = await Cart.findOne({ customerId });

  // Different restaurant conflict
  if (cart && cart.restaurantId.toString() !== menuItem.restaurantId.toString()) {
    if (req.headers['x-clear-cart'] === 'true') {
      cart.items = [];
      cart.restaurantId = menuItem.restaurantId;
    } else {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        currentRestaurant: cart.restaurantId,
        newRestaurant: menuItem.restaurantId,
        message: 'Cart contains items from another restaurant',
      });
    }
  }

  if (cart) {
    const existingItem = cart.items.find(
      (i) => i.menuItemId.toString() === menuItemId
    );
    if (existingItem) {
      existingItem.quantity = Math.min(20, existingItem.quantity + quantity);
      if (specialInstructions) existingItem.specialInstructions = specialInstructions;
    } else {
      cart.items.push({ menuItemId, quantity, specialInstructions, itemPrice: menuItem.price });
    }
    await cart.save();
  } else {
    cart = await Cart.create({
      customerId,
      restaurantId: menuItem.restaurantId,
      items: [{ menuItemId, quantity, specialInstructions, itemPrice: menuItem.price }],
    });
  }

  const populated = await Cart.findById(cart._id)
    .populate('items.menuItemId', 'name price photo isAvailable')
    .populate('restaurantId', 'name coverPhoto');
  const data = populated.toObject();
  data.subtotal = computeSubtotal(populated.items);

  res.status(200).json({ success: true, data });
});

// ─── Update Cart Item ─────────────────────────────────────────────────────────

exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { menuItemId } = req.params;
  const { quantity, specialInstructions } = req.body;

  const cart = await Cart.findOne({ customerId: req.user.userId });
  if (!cart) return next(new AppError('Cart not found', 404, 'NOT_FOUND'));

  const itemIndex = cart.items.findIndex((i) => i.menuItemId.toString() === menuItemId);
  if (itemIndex === -1) return next(new AppError('Item not in cart', 404, 'NOT_FOUND'));

  if (quantity === 0) {
    cart.items.splice(itemIndex, 1);
    if (cart.items.length === 0) {
      await Cart.findByIdAndDelete(cart._id);
      return res.status(200).json({ success: true, data: { items: [], restaurantId: null, subtotal: 0 } });
    }
  } else {
    if (quantity !== undefined) cart.items[itemIndex].quantity = quantity;
    if (specialInstructions !== undefined) cart.items[itemIndex].specialInstructions = specialInstructions;
  }

  await cart.save();
  const populated = await Cart.findById(cart._id).populate('items.menuItemId', 'name price photo isAvailable');
  const data = populated.toObject();
  data.subtotal = computeSubtotal(populated.items);

  res.status(200).json({ success: true, data });
});

// ─── Remove Cart Item ─────────────────────────────────────────────────────────

exports.removeCartItem = catchAsync(async (req, res, next) => {
  const { menuItemId } = req.params;

  const cart = await Cart.findOne({ customerId: req.user.userId });
  if (!cart) return next(new AppError('Cart not found', 404, 'NOT_FOUND'));

  cart.items = cart.items.filter((i) => i.menuItemId.toString() !== menuItemId);

  if (cart.items.length === 0) {
    await Cart.findByIdAndDelete(cart._id);
    return res.status(200).json({ success: true, data: { items: [], restaurantId: null, subtotal: 0 } });
  }

  await cart.save();
  const populated = await Cart.findById(cart._id).populate('items.menuItemId', 'name price photo isAvailable');
  const data = populated.toObject();
  data.subtotal = computeSubtotal(populated.items);

  res.status(200).json({ success: true, data });
});

// ─── Clear Cart ───────────────────────────────────────────────────────────────

exports.clearCart = catchAsync(async (req, res, next) => {
  await Cart.findOneAndDelete({ customerId: req.user.userId });
  res.status(200).json({ success: true, message: 'Cart cleared' });
});

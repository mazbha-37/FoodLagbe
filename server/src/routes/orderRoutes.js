const express = require('express');
const router = express.Router();

const {
  placeOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');

const { createReview } = require('../controllers/reviewController');
const { getMessages, sendMessage } = require('../controllers/messageController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { uploadMultiple } = require('../middleware/upload');
const { placeOrderSchema, cancelOrderSchema } = require('../validators/orderValidator');
const { createReviewSchema } = require('../validators/reviewValidator');

// ─── Orders ───────────────────────────────────────────────────────────────────

router.post('/', authenticate, authorize('customer'), validate(placeOrderSchema), placeOrder);
router.get('/', authenticate, getOrders);
router.get('/:id', authenticate, getOrderById);
router.patch('/:id/status', authenticate, authorize('restaurant_owner', 'rider'), (req, res, next) => {
  if (!req.body.status) return next(new (require('../utils/AppError'))('status is required', 400));
  next();
}, updateOrderStatus);
router.post('/:id/cancel', authenticate, authorize('customer', 'admin'), validate(cancelOrderSchema), cancelOrder);

// ─── Review (customer — one per delivered order) ──────────────────────────────

router.post(
  '/:orderId/reviews',
  authenticate,
  authorize('customer'),
  uploadMultiple('images', 3),
  validate(createReviewSchema),
  createReview
);

// ─── Messaging (customer ↔ rider) ─────────────────────────────────────────────

router.get('/:id/messages', authenticate, getMessages);
router.post('/:id/messages', authenticate, sendMessage);

module.exports = router;

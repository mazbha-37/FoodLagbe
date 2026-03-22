const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { addToCartSchema } = require('../validators/cartValidator');

router.use(authenticate, authorize('customer'));

router.get('/', getCart);
router.post('/items', validate(addToCartSchema), addToCart);
router.patch('/items/:menuItemId', updateCartItem);
router.delete('/items/:menuItemId', removeCartItem);
router.delete('/', clearCart);

module.exports = router;

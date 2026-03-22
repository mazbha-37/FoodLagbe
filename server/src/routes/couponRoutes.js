const express = require('express');
const router = express.Router();

const { applyCoupon } = require('../controllers/couponController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { applyCouponSchema } = require('../validators/couponValidator');

router.post('/apply', authenticate, authorize('customer'), validate(applyCouponSchema), applyCoupon);

module.exports = router;

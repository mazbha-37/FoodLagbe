const express = require('express');
const router = express.Router();
const { stripeWebhook } = require('../controllers/webhookController');

// Raw body required for Stripe signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;

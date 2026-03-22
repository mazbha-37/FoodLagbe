const express = require('express');
const router = express.Router();

const {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurant,
  toggleRestaurantStatus,
  getMyRestaurant,
  getRestaurantEarnings,
} = require('../controllers/restaurantController');

const { getRestaurantReviews } = require('../controllers/reviewController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { uploadSingle, uploadFields } = require('../middleware/upload');
const { createRestaurantSchema, updateRestaurantSchema } = require('../validators/restaurantValidator');

// Public
router.get('/', getRestaurants);

// Authenticated — restaurant_owner only (must come before /:id)
router.get(
  '/me',
  authenticate,
  authorize('restaurant_owner'),
  getMyRestaurant
);

router.get('/:id', getRestaurantById);
router.post(
  '/',
  authenticate,
  authorize('restaurant_owner'),
  uploadFields([
    { name: 'coverPhoto', maxCount: 1 },
    { name: 'tradeLicensePhoto', maxCount: 1 },
  ]),
  validate(createRestaurantSchema),
  createRestaurant
);
router.patch(
  '/:id',
  authenticate,
  authorize('restaurant_owner'),
  uploadSingle('coverPhoto'),
  validate(updateRestaurantSchema),
  updateRestaurant
);
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('restaurant_owner'),
  toggleRestaurantStatus
);
router.get(
  '/:id/earnings',
  authenticate,
  authorize('restaurant_owner'),
  getRestaurantEarnings
);

// Public reviews for a restaurant
router.get('/:restaurantId/reviews', getRestaurantReviews);

module.exports = router;

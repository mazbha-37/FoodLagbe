const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { uploadSingle } = require('../middleware/upload');
const {
  getMyProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
} = require('../controllers/userController');
const { getMyReviews } = require('../controllers/reviewController');

// All routes require authentication
router.use(authenticate);

router.get('/profile', getMyProfile);
router.patch('/profile', uploadSingle('profilePhoto'), updateProfile);

router.get('/reviews', getMyReviews);

router.post('/addresses', addAddress);
router.patch('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);

module.exports = router;

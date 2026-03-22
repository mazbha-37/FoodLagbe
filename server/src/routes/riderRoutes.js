const express = require('express');
const router = express.Router();

const {
  getMyRider,
  getActiveDelivery,
  applyAsRider,
  toggleAvailability,
  updateRiderLocation,
  getRiderEarnings,
  getDeliveryHistory,
} = require('../controllers/riderController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { uploadFields } = require('../middleware/upload');
const { riderApplicationSchema, updateLocationSchema } = require('../validators/riderValidator');

router.get('/me', authenticate, authorize('rider'), getMyRider);
router.get('/active-delivery', authenticate, authorize('rider'), getActiveDelivery);

router.post(
  '/apply',
  authenticate,
  authorize('rider'),
  uploadFields([
    { name: 'nidPhoto', maxCount: 1 },
    { name: 'vehicleRegPhoto', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 },
  ]),
  validate(riderApplicationSchema),
  applyAsRider
);

router.patch(
  '/toggle-availability',
  authenticate,
  authorize('rider'),
  toggleAvailability
);

router.patch(
  '/location',
  authenticate,
  authorize('rider'),
  validate(updateLocationSchema),
  updateRiderLocation
);

router.get('/earnings', authenticate, authorize('rider'), getRiderEarnings);
router.get('/delivery-history', authenticate, authorize('rider'), getDeliveryHistory);

module.exports = router;

const express = require('express');
const router = express.Router();

const { fileComplaint, getComplaint, getMyComplaints } = require('../controllers/complaintController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createComplaintSchema } = require('../validators/complaintValidator');

router.post('/', authenticate, authorize('customer'), validate(createComplaintSchema), fileComplaint);
router.get('/me', authenticate, authorize('customer'), getMyComplaints);
router.get('/:id', authenticate, authorize('customer', 'admin'), getComplaint);

module.exports = router;

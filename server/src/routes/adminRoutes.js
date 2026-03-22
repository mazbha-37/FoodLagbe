const express = require('express');
const router = express.Router();

const {
  getDashboard,
  getRestaurantApplications,
  approveRestaurant,
  rejectRestaurant,
  suspendRestaurant,
  unsuspendRestaurant,
  getRiders,
  approveRider,
  rejectRider,
  getCustomers,
  getUsers,
  suspendUser,
  unsuspendUser,
  getComplaints,
  updateComplaint,
  getAllOrders,
  createCoupon,
  getCoupons,
  updateCoupon,
  deactivateCoupon,
  deleteReview,
  getRevenue,
} = require('../controllers/adminController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { updateComplaintSchema } = require('../validators/complaintValidator');

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// Revenue
router.get('/revenue', getRevenue);

// Restaurants
router.get('/restaurants', getRestaurantApplications);
router.patch('/restaurants/:id/approve', approveRestaurant);
router.patch('/restaurants/:id/reject', rejectRestaurant);
router.patch('/restaurants/:id/suspend', suspendRestaurant);
router.patch('/restaurants/:id/unsuspend', unsuspendRestaurant);

// Riders
router.get('/riders', getRiders);
router.patch('/riders/:id/approve', approveRider);
router.patch('/riders/:id/reject', rejectRider);

// Users (generic with role filter)
router.get('/users', getUsers);
// Customers (legacy alias)
router.get('/customers', getCustomers);

// Suspend / unsuspend any user
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/unsuspend', unsuspendUser);

// Complaints
router.get('/complaints', getComplaints);
router.patch('/complaints/:id', validate(updateComplaintSchema), updateComplaint);

// Orders
router.get('/orders', getAllOrders);

// Coupons
router.post('/coupons', createCoupon);
router.get('/coupons', getCoupons);
router.patch('/coupons/:id', updateCoupon);
router.patch('/coupons/:id/deactivate', deactivateCoupon);

// Reviews
router.delete('/reviews/:id', deleteReview);

module.exports = router;

const express = require('express');
const router = express.Router({ mergeParams: true }); // inherit :restaurantId and :catId

const {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/menuItemController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { uploadSingle } = require('../middleware/upload');
const { createMenuItemSchema, updateMenuItemSchema } = require('../validators/menuValidator');

router.get('/', getMenuItems);
router.post('/', authenticate, authorize('restaurant_owner'), uploadSingle('photo'), validate(createMenuItemSchema), createMenuItem);
router.patch('/:itemId', authenticate, authorize('restaurant_owner'), uploadSingle('photo'), validate(updateMenuItemSchema), updateMenuItem);
router.delete('/:itemId', authenticate, authorize('restaurant_owner'), deleteMenuItem);

module.exports = router;

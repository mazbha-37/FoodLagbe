const express = require('express');
const router = express.Router({ mergeParams: true }); // inherit :restaurantId

const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createCategorySchema, updateCategorySchema } = require('../validators/menuValidator');

router.get('/', getCategories);
router.post('/', authenticate, authorize('restaurant_owner'), validate(createCategorySchema), createCategory);
router.patch('/:catId', authenticate, authorize('restaurant_owner'), validate(updateCategorySchema), updateCategory);
router.delete('/:catId', authenticate, authorize('restaurant_owner'), deleteCategory);

module.exports = router;

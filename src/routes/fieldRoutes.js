const express = require('express');

const FieldController = require('../controllers/fieldController');
const validate = require('../middleware/validationMiddleware');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { createFieldValidator, updateFieldValidator } = require('../validators/fieldValidator');

const router = express.Router();

// Public
router.get('/', FieldController.list);
router.get('/:id', FieldController.get);
router.get('/:id/availability', FieldController.availability);

// Owner/Admin
router.post('/', protect, restrictTo('field_owner', 'admin'), validate(createFieldValidator), FieldController.create);
router.patch('/:id', protect, restrictTo('field_owner', 'admin'), validate(updateFieldValidator), FieldController.update);
router.delete('/:id', protect, restrictTo('field_owner', 'admin'), FieldController.remove);

module.exports = router;


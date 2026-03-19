const express = require('express');

const UserController = require('../controllers/userController');
const validate = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { addFavoriteValidator } = require('../validators/userValidator');

const router = express.Router();
router.use(protect);

router.get('/favorites', UserController.listFavorites);
router.post('/favorites', validate(addFavoriteValidator), UserController.addFavorite);
router.delete('/favorites/:fieldId', UserController.removeFavorite);

module.exports = router;


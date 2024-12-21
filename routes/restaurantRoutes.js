const express = require('express');
const restaurantController = require('../controller/RestaurantController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', restaurantController.createRestaurant);

router.post('/login', restaurantController.loginRestaurant);

router.get('/', restaurantController.getAllRestaurants);

router.get('/protected', protect, restaurantController.getAllRestaurants);

router.put('/:restaurantId/logo', restaurantController.updateRestaurantLogo);

router.put('/:restaurantId/password', restaurantController.updateRestaurantPassword);

module.exports = router;

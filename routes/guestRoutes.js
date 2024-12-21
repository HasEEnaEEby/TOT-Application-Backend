const express = require('express');
const guestController = require('../controller/GuestController');
const router = express.Router();


router.post('/create-session', guestController.createGuestSession);
router.get('/restaurants/:restaurantId/menu', guestController.viewMenu);
router.post('/restaurants/:restaurantId/order', guestController.placeOrder);

module.exports = router;

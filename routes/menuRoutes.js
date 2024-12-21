const express = require('express');
const router = express.Router();
const { createOrUpdateMenu, getMenu, updateMenu, deleteMenu } = require('../controller/MenuController');
const { verifyRestaurant } = require('../middleware/verifyRestaurant');

router.post('/:restaurantId/menu', verifyRestaurant, createOrUpdateMenu);

router.get('/:restaurantId/menu', getMenu);

router.put('/menu/:menuId', verifyRestaurant, updateMenu);

router.delete('/menu/:menuId', verifyRestaurant, deleteMenu);

module.exports = router;

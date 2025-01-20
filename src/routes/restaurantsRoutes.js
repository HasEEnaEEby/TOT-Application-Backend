import express from 'express';
import {
    addMenuItem,
    getMenuItems,
    updateMenuItem,
    deleteMenuItem,
} from '../controllers/restautantController.js';
import { protect, restaurant } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { menuItemValidator } from '../validators/restaurantValidator.js';

const router = express.Router();

router.post('/menu', protect, restaurant, validateRequest(menuItemValidator), addMenuItem);
router.get('/menu', protect, restaurant, getMenuItems);
router.put('/menu/:id', protect, restaurant, validateRequest(menuItemValidator), updateMenuItem);
router.delete('/menu/:id', protect, restaurant, deleteMenuItem);

export default router;

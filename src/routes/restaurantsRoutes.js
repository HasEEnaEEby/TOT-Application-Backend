// src/routes/restaurantRoutes.js
import express from 'express';
import { restaurantController } from '../controllers/restaurantController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { validateMenuItem } from '../validators/restaurantValidator.js';

const router = express.Router();

// Apply authentication and role middleware to all routes
router.use(protect);
router.use(restrictTo('restaurant'));

// Profile Routes
router.get('/profile', restaurantController.getProfile);
router.put('/profile', restaurantController.updateProfile);

// Image Upload Routes
router.post(
  '/upload-image',
  upload.single('image'),
  restaurantController.uploadImage
);
router.delete('/image/:type', restaurantController.deleteImage);

// Menu Routes
router.route('/menu')
  .get(restaurantController.getMenuItems)
  .post(validateMenuItem, restaurantController.createMenuItem);

router.route('/menu/:id')
  .get(restaurantController.getMenuItem)
  .put(validateMenuItem, restaurantController.updateMenuItem)
  .delete(restaurantController.deleteMenuItem);

router.get('/menu/category/:category', restaurantController.getMenuItemsByCategory);
router.patch('/menu/:id/toggle-availability', restaurantController.toggleMenuItemAvailability);

export default router;
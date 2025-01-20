import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';
import adminController from '../controllers/adminController.js';
import logger from '../utils/logger.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { bulkActionValidator } from '../validators/adminValidation.js';

const router = express.Router();

router.use((req, res, next) => {
  logger.info('Admin route accessed', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  });
  next();
});

router.use(protect);
router.use(roleMiddleware(['admin']));

router.get(
  '/restaurants/pending',
  async (req, res, next) => {
    try {
      logger.info('Fetching pending restaurants', { adminId: req.user._id });
      await adminController.getPendingRestaurants(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/restaurants/:id/approve',
  async (req, res, next) => {
    try {
      logger.info('Approving restaurant', { 
        adminId: req.user._id,
        restaurantId: req.params.id 
      });
      await adminController.approveRestaurant(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/restaurants/:id/reject',
  async (req, res, next) => {
    try {
      logger.info('Rejecting restaurant', { 
        adminId: req.user._id,
        restaurantId: req.params.id 
      });
      await adminController.rejectRestaurant(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/restaurants/bulk-approve',
  validateRequest(bulkActionValidator),
  async (req, res, next) => {
    try {
      logger.info('Bulk approving restaurants', { 
        adminId: req.user._id,
        restaurantIds: req.body.ids 
      });
      await adminController.bulkApproveRestaurants(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/restaurants/bulk-reject',
  validateRequest(bulkActionValidator),
  async (req, res, next) => {
    try {
      logger.info('Bulk rejecting restaurants', { 
        adminId: req.user._id,
        restaurantIds: req.body.ids 
      });
      await adminController.bulkRejectRestaurants(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
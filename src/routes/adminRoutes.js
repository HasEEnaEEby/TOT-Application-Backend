import express from 'express';
import { adminController } from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import logger from '../utils/logger.js';
import { bulkActionValidator } from '../validators/adminValidation.js';

const router = express.Router();

// Logging middleware
router.use((req, res, next) => {
  logger.info('Admin route accessed', {
    method: req.method,
    path: req.originalUrl,
    requestId: req.id
  });
  next();
});

router.use(protect);
router.use(roleMiddleware(['admin']));

// Restaurant management routes
router.route('/restaurants/pending')
  .get(adminController.getPendingRestaurants);

router.route('/restaurants/approve')
  .post(adminController.approveRestaurant);

router.route('/restaurants/reject')
  .post(adminController.rejectRestaurant);

router.route('/restaurants/bulk-approve')
  .post(
    validateRequest(bulkActionValidator),
    adminController.bulkApproveRestaurants
  );

router.route('/restaurants/bulk-reject')
  .post(
    validateRequest(bulkActionValidator),
    adminController.bulkRejectRestaurants
  );

export default router;
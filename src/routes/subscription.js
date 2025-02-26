import express from 'express';
import subscriptionController from '../../controllers/subscriptionController.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import { restrictTo } from '../../middlewares/role.middleware.js';

const router = express.Router();

router.use(verifyJWT, restrictTo('admin'));

router.route('/')
  .get(subscriptionController.getAllSubscriptions)
  .post(subscriptionController.createSubscription);

router.route('/:id/renew')
  .post(subscriptionController.renewSubscription);

router.route('/:id/payment')
  .patch(subscriptionController.updatePaymentStatus);

export default router;
import express from 'express';
import incomeController from '../controllers/incomeController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

// Routes
router.route('/')
  .get(incomeController.getIncomeData);

router.route('/report')
  .get(incomeController.generateReport);  

export default router;
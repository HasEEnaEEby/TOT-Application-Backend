// tableRoutes.js
import express from 'express';
import { customerTableController } from '../controllers/customerTableController.js';
import { tableController } from '../controllers/tableController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Restaurant owner routes
router.get('/', protect, restrictTo('restaurant'), tableController.getRestaurantTables);
router.post('/', protect, restrictTo('restaurant'), tableController.createTable);
router.put('/:tableId', protect, restrictTo('restaurant'), tableController.updateTable);
router.delete('/:tableId', protect, restrictTo('restaurant'), tableController.deleteTable);
router.patch('/:tableId/status', protect, restrictTo('restaurant'), tableController.updateTableStatus);

// Customer routes - uses customerTableController
router.get('/restaurant/:restaurantId', customerTableController.getRestaurantTables);
router.get('/restaurant/:restaurantId/available', customerTableController.getAvailableTables);
router.get('/:tableId/details', customerTableController.getTableById);
router.post('/:tableId/request', protect, restrictTo('customer'), customerTableController.requestTable);

export default router;
// src/routes/TaskROutes.js
import express from 'express';
import {
    completeTask,
    createTask,
    deleteTask,
    getTaskMetrics,
    getTasks,
    updateTask
} from '../controllers/TaskController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
    createTaskValidation,
    updateTaskValidation
} from '../validators/taskValidator.js';

const router = express.Router();

// Detailed logging middleware
router.use((req, res, next) => {
    console.log('Task Route Middleware:', {
        method: req.method,
        fullPath: req.originalUrl,
        path: req.path,
        body: req.body
    });
    next();
});

// Apply authentication middleware
router.use(protect);

// Task routes
router
  .route('/')
  .get(getTasks)
  .post(
    (req, res, next) => {
      console.log('Create Task Request:', req.body);
      next();
    },
    validateRequest(createTaskValidation), 
    createTask
  );

// Get task metrics
router.get('/metrics', getTaskMetrics);

// Individual task routes
router
  .route('/:id')
  .patch(validateRequest(updateTaskValidation), updateTask)
  .delete(deleteTask);

// Complete task route
router.patch('/:id/complete', completeTask);

export default router;
import { statusCode } from '../constants/statusCode.js';
import TaskService from '../services/TaskService.js';
import catchAsync from '../utils/catchAsync.js';

// Export each method individually
export const createTask = catchAsync(async (req, res) => {
  console.log('CreateTask - Received user:', req.user);
  const userId = req.user._id;
  const task = await TaskService.createTask(req.body, userId);

  res.status(statusCode.CREATED).json({
    status: 'success',
    data: task
  });
});

export const getTasks = catchAsync(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    priority, 
    type 
  } = req.query;

  const filters = { status, priority, type };
  const tasks = await TaskService.getTasks(filters, Number(page), Number(limit));

  res.status(statusCode.OK).json({
    status: 'success',
    ...tasks
  });
});

export const getTaskMetrics = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const metrics = await TaskService.getTaskMetrics(userId);

  res.status(statusCode.OK).json({
    status: 'success',
    data: metrics
  });
});

export const updateTask = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const updatedTask = await TaskService.updateTask(id, req.body, userId);

  res.status(statusCode.OK).json({
    status: 'success',
    data: updatedTask
  });
});

export const completeTask = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  const completedTask = await TaskService.completeTask(id, userId);

  res.status(statusCode.OK).json({
    status: 'success',
    data: completedTask
  });
});

export const deleteTask = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;
  await TaskService.deleteTask(id, userId);

  res.status(statusCode.NO_CONTENT).json({
    status: 'success',
    data: null
  });
});

// Optional: If you still want a class-based approach
export class TaskController {
  createTask = createTask;
  getTasks = getTasks;
  getTaskMetrics = getTaskMetrics;
  updateTask = updateTask;
  completeTask = completeTask;
  deleteTask = deleteTask;
}

// Optional: Export a default instance if needed
export default {
  createTask,
  getTasks,
  getTaskMetrics,
  updateTask,
  completeTask,
  deleteTask
};
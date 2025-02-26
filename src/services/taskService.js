// src/services/taskService.js
import Task from '../models/task.js';
import AppError from '../utils/AppError.js';

class TaskService {
  async createTask(taskData, userId) {
    try {
      const task = new Task({
        ...taskData,
        createdBy: userId
      });
      return await task.save();
    } catch (error) {
      throw new AppError('Error creating task', 400, error);
    }
  }

  async getTasks(filters = {}, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const query = {};
      
      // Apply filters
      if (filters.status) query.status = filters.status;
      if (filters.priority) query.priority = filters.priority;
      if (filters.type) query.type = filters.type;

      const tasks = await Task.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email');

      const total = await Task.countDocuments(query);

      return {
        tasks,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTasks: total
      };
    } catch (error) {
      throw new AppError('Error fetching tasks', 500, error);
    }
  }

  // Get task metrics
  async getTaskMetrics(userId) {
    try {
      const metrics = await Promise.all([
        Task.countDocuments({ status: 'pending', createdBy: userId }),
        Task.countDocuments({ status: 'completed', createdBy: userId }),
        Task.countDocuments({ priority: 'high', status: { $ne: 'completed' }, createdBy: userId })
      ]);

      return {
        pendingTasks: metrics[0],
        completedTasks: metrics[1],
        highPriorityTasks: metrics[2]
      };
    } catch (error) {
      throw new AppError('Error fetching task metrics', 500, error);
    }
  }

  // Update a task
  async updateTask(taskId, updateData, userId) {
    try {
      const task = await Task.findOneAndUpdate(
        { _id: taskId, createdBy: userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!task) {
        throw new AppError('Task not found or you do not have permission to update', 404);
      }

      return task;
    } catch (error) {
      throw new AppError('Error updating task', 400, error);
    }
  }

  // Complete a task
  async completeTask(taskId, userId) {
    try {
      const task = await Task.findOneAndUpdate(
        { _id: taskId, createdBy: userId },
        { status: 'completed' },
        { new: true }
      );

      if (!task) {
        throw new AppError('Task not found or you do not have permission to complete', 404);
      }

      return task;
    } catch (error) {
      throw new AppError('Error completing task', 400, error);
    }
  }

  // Delete a task
  async deleteTask(taskId, userId) {
    try {
      const task = await Task.findOneAndDelete({ 
        _id: taskId, 
        createdBy: userId 
      });

      if (!task) {
        throw new AppError('Task not found or you do not have permission to delete', 404);
      }

      return task;
    } catch (error) {
      throw new AppError('Error deleting task', 400, error);
    }
  }

  // Add a note to a task
  async addTaskNote(taskId, noteData, userId) {
    try {
      const task = await Task.findById(taskId);

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      task.notes.push({
        content: noteData.content,
        createdBy: userId
      });

      return await task.save();
    } catch (error) {
      throw new AppError('Error adding task note', 400, error);
    }
  }
}

export default new TaskService();
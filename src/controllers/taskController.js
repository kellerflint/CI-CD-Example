const { AppError } = require('../middleware/errorHandler');
const Task = require('../models/task');
const Project = require('../models/project');

// Get all tasks for a project
exports.getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    // Check if project exists and user has access
    const hasAccess = await Project.checkUserAccess(projectId, req.user.id);
    if (!hasAccess) {
      return next(new AppError('You do not have access to this project', 403));
    }
    
    const { tasks, stats } = await Task.getTasksWithStats(projectId);
    
    res.status(200).json({
      status: 'success',
      data: {
        tasks,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single task
exports.getTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    const task = await Task.findById(taskId);
    
    if (!task) {
      return next(new AppError('Task not found', 404));
    }
    
    // Check if user has access to the project
    const hasAccess = await Project.checkUserAccess(task.project_id, req.user.id);
    if (!hasAccess) {
      return next(new AppError('You do not have access to this task', 403));
    }
    
    // Get comments for the task
    const comments = await Task.getComments(taskId);
    
    res.status(200).json({
      status: 'success',
      data: {
        task,
        comments
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new task
exports.createTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, assignee_id, status, priority, due_date } = req.body;
    
    // Check if project exists and user has access
    const hasAccess = await Project.checkUserAccess(projectId, req.user.id, ['admin', 'member']);
    if (!hasAccess) {
      return next(new AppError('You do not have permission to create tasks in this project', 403));
    }
    
    const task = await Task.create({
      title,
      description,
      project_id: projectId,
      assignee_id,
      created_by: req.user.id,
      status,
      priority,
      due_date: due_date ? new Date(due_date) : null
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        task
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a task
exports.updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;
    
    // Find the task
    const task = await Task.findById(taskId);
    
    if (!task) {
      return next(new AppError('Task not found', 404));
    }
    
    // Check if user has access to the project
    const hasAccess = await Project.checkUserAccess(task.project_id, req.user.id, ['admin', 'member']);
    if (!hasAccess) {
      return next(new AppError('You do not have permission to update this task', 403));
    }
    
    // Convert due_date string to Date object if provided
    if (updateData.due_date) {
      updateData.due_date = new Date(updateData.due_date);
    }
    
    const updatedTask = await Task.update(taskId, updateData);
    
    res.status(200).json({
      status: 'success',
      data: {
        task: updatedTask
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a task
exports.deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    // Find the task
    const task = await Task.findById(taskId);
    
    if (!task) {
      return next(new AppError('Task not found', 404));
    }
    
    // Check if user has access to the project
    const hasAccess = await Project.checkUserAccess(task.project_id, req.user.id, ['admin']);
    if (!hasAccess) {
      return next(new AppError('You do not have permission to delete this task', 403));
    }
    
    await Task.delete(taskId);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Add a comment to a task
exports.addComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    
    // Find the task
    const task = await Task.findById(taskId);
    
    if (!task) {
      return next(new AppError('Task not found', 404));
    }
    
    // Check if user has access to the project
    const hasAccess = await Project.checkUserAccess(task.project_id, req.user.id);
    if (!hasAccess) {
      return next(new AppError('You do not have access to this task', 403));
    }
    
    const comment = await Task.addComment({
      content,
      task_id: taskId,
      user_id: req.user.id
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        comment
      }
    });
  } catch (error) {
    next(error);
  }
}; 
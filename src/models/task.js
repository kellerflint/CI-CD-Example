const db = require('../config/database');

class Task {
  static async findById(id) {
    return db('tasks').where({ id }).first();
  }

  static async findByProject(projectId) {
    return db('tasks').where({ project_id: projectId });
  }

  static async findByAssignee(assigneeId) {
    return db('tasks').where({ assignee_id: assigneeId });
  }

  static async create(taskData) {
    const [task] = await db('tasks').insert({
      title: taskData.title,
      description: taskData.description,
      project_id: taskData.project_id,
      assignee_id: taskData.assignee_id,
      created_by: taskData.created_by,
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date
    }).returning('*');
    
    return task;
  }

  static async update(id, taskData) {
    const [updatedTask] = await db('tasks')
      .where({ id })
      .update(taskData)
      .returning('*');
      
    return updatedTask;
  }

  static async delete(id) {
    return db('tasks').where({ id }).del();
  }

  static async getComments(taskId) {
    return db('comments')
      .where({ task_id: taskId })
      .orderBy('created_at', 'asc');
  }

  static async addComment(commentData) {
    const [comment] = await db('comments').insert({
      content: commentData.content,
      task_id: commentData.task_id,
      user_id: commentData.user_id
    }).returning('*');
    
    return comment;
  }

  static async getTasksWithStats(projectId) {
    const tasks = await db('tasks')
      .where({ project_id: projectId })
      .select('*');
      
    const stats = {
      total: tasks.length,
      todo: tasks.filter(task => task.status === 'todo').length,
      in_progress: tasks.filter(task => task.status === 'in_progress').length,
      review: tasks.filter(task => task.status === 'review').length,
      done: tasks.filter(task => task.status === 'done').length
    };
    
    return { tasks, stats };
  }
}

module.exports = Task; 
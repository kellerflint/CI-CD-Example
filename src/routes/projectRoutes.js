const express = require('express');
const projectController = require('../controllers/projectController');
const taskController = require('../controllers/taskController');
const { protect, requireActiveSubscription } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Project routes
router.route('/')
  .get(projectController.getProjects)
  .post(requireActiveSubscription, projectController.createProject);

router.route('/:projectId')
  .get(projectController.getProject)
  .patch(projectController.updateProject)
  .delete(projectController.deleteProject);

// Project members routes
router.get('/:projectId/members', projectController.getProjectMembers);
router.post('/:projectId/members', requireActiveSubscription, projectController.addProjectMember);
router.patch('/:projectId/members/:userId', projectController.updateMemberRole);
router.delete('/:projectId/members/:userId', projectController.removeMember);

// Task routes
router.route('/:projectId/tasks')
  .get(taskController.getTasks)
  .post(requireActiveSubscription, taskController.createTask);

router.route('/:projectId/tasks/:taskId')
  .get(taskController.getTask)
  .patch(taskController.updateTask)
  .delete(taskController.deleteTask);

// Task comments
router.post('/:projectId/tasks/:taskId/comments', taskController.addComment);

module.exports = router; 
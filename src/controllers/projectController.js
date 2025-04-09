const { AppError } = require('../middleware/errorHandler');
const Project = require('../models/project');

// Get all projects for the current user
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await Project.findByUser(req.user.id);
    
    res.status(200).json({
      status: 'success',
      results: projects.length,
      data: {
        projects
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a single project
exports.getProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    const project = await Project.findById(projectId);
    
    if (!project) {
      return next(new AppError('Project not found', 404));
    }
    
    // Check if user has access to the project
    const hasAccess = await Project.checkUserAccess(projectId, req.user.id);
    if (!hasAccess) {
      return next(new AppError('You do not have access to this project', 403));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a new project
exports.createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    const project = await Project.create({
      name,
      description,
      owner_id: req.user.id
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        project
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a project
exports.updateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;
    
    // Check if project exists
    const project = await Project.findById(projectId);
    
    if (!project) {
      return next(new AppError('Project not found', 404));
    }
    
    // Check if user has admin access to the project
    const hasAccess = await Project.checkUserAccess(projectId, req.user.id, ['admin']);
    if (!hasAccess) {
      return next(new AppError('You do not have permission to update this project', 403));
    }
    
    const updatedProject = await Project.update(projectId, {
      name,
      description
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        project: updatedProject
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a project
exports.deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    // Check if project exists
    const project = await Project.findById(projectId);
    
    if (!project) {
      return next(new AppError('Project not found', 404));
    }
    
    // Check if user is the owner
    if (project.owner_id !== req.user.id) {
      return next(new AppError('Only the project owner can delete the project', 403));
    }
    
    await Project.delete(projectId);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Get project members
exports.getProjectMembers = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    // Check if project exists and user has access
    const hasAccess = await Project.checkUserAccess(projectId, req.user.id);
    if (!hasAccess) {
      return next(new AppError('You do not have access to this project', 403));
    }
    
    const members = await Project.getMembers(projectId);
    
    res.status(200).json({
      status: 'success',
      results: members.length,
      data: {
        members
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add a member to a project
exports.addProjectMember = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body;
    
    // Check if project exists and user has admin access
    const hasAccess = await Project.checkUserAccess(projectId, req.user.id, ['admin']);
    if (!hasAccess) {
      return next(new AppError('You do not have permission to add members to this project', 403));
    }
    
    const member = await Project.addMember(projectId, userId, role);
    
    res.status(201).json({
      status: 'success',
      data: {
        member
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update a member's role
exports.updateMemberRole = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body;
    
    // Check if project exists and user has admin access
    const hasAccess = await Project.checkUserAccess(projectId, req.user.id, ['admin']);
    if (!hasAccess) {
      return next(new AppError('You do not have permission to update member roles', 403));
    }
    
    const updatedMember = await Project.updateMemberRole(projectId, userId, role);
    
    if (!updatedMember) {
      return next(new AppError('Member not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        member: updatedMember
      }
    });
  } catch (error) {
    next(error);
  }
};

// Remove a member from a project
exports.removeMember = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    
    // Check if project exists and user has admin access
    const hasAccess = await Project.checkUserAccess(projectId, req.user.id, ['admin']);
    if (!hasAccess) {
      return next(new AppError('You do not have permission to remove members', 403));
    }
    
    // Prevent removing the owner
    const project = await Project.findById(projectId);
    if (project.owner_id === userId) {
      return next(new AppError('Cannot remove the project owner', 400));
    }
    
    await Project.removeMember(projectId, userId);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
}; 
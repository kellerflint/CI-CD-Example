const { AppError } = require('../middleware/errorHandler');
const User = require('../models/user');
const Subscription = require('../models/subscription');

// Get current user
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    // Get subscription info
    const subscription = await Subscription.findByUserId(user.id);
    
    // Remove sensitive data
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          ...user,
          subscription: subscription || null
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update current user
exports.updateMe = async (req, res, next) => {
  try {
    // Check if user is trying to update password
    if (req.body.password) {
      return next(new AppError('This route is not for password updates. Please use /auth/update-password', 400));
    }
    
    // Filter out unwanted fields that are not allowed to be updated
    const filteredBody = {};
    const allowedFields = ['first_name', 'last_name', 'email'];
    Object.keys(req.body).forEach(field => {
      if (allowedFields.includes(field)) {
        filteredBody[field] = req.body[field];
      }
    });
    
    // Update user
    const updatedUser = await User.update(req.user.id, filteredBody);
    
    // Remove sensitive data
    updatedUser.password = undefined;
    
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete current user
exports.deleteMe = async (req, res, next) => {
  try {
    await User.update(req.user.id, { active: false });
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// ADMIN CONTROLLERS

// Get all users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'created_at', 'updated_at');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
exports.getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    // Get subscription info
    const subscription = await Subscription.findByUserId(id);
    
    // Remove sensitive data
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          ...user,
          subscription: subscription || null
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Filter out unwanted fields
    const filteredBody = {};
    const allowedFields = ['first_name', 'last_name', 'email', 'role'];
    Object.keys(req.body).forEach(field => {
      if (allowedFields.includes(field)) {
        filteredBody[field] = req.body[field];
      }
    });
    
    const updatedUser = await User.update(id, filteredBody);
    
    if (!updatedUser) {
      return next(new AppError('User not found', 404));
    }
    
    // Remove sensitive data
    updatedUser.password = undefined;
    
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete user
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await User.delete(id);
    
    if (!result) {
      return next(new AppError('User not found', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
}; 
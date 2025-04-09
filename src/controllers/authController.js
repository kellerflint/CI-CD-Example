const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');
const User = require('../models/user');
const Subscription = require('../models/subscription');

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION,
  });
};

// Create and send token response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// Register a new user
exports.register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }
    
    // Create user
    const newUser = await User.create({
      email,
      password,
      first_name,
      last_name,
    });
    
    // Create Stripe customer
    const customer = await Subscription.createStripeCustomer(newUser);
    
    // Create free subscription
    await Subscription.create({
      user_id: newUser.id,
      stripe_customer_id: customer.id,
      plan: 'free',
      status: 'active',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    });
    
    createSendToken(newUser, 201, res);
  } catch (error) {
    next(error);
  }
};

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }
    
    // Check if user exists && password is correct
    const user = await User.findByEmail(email);
    
    if (!user || !(await User.comparePassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }
    
    // If everything ok, send token to client
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// Get current user profile
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    // Get subscription info
    const subscription = await Subscription.findByUserId(user.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          subscription: subscription ? {
            plan: subscription.plan,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
          } : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateMe = async (req, res, next) => {
  try {
    // Check if user is trying to update password
    if (req.body.password) {
      return next(new AppError('This route is not for password updates. Please use /updatePassword', 400));
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
    
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update password
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user
    const user = await User.findById(req.user.id);
    
    // Check if current password is correct
    if (!(await User.comparePassword(currentPassword, user.password))) {
      return next(new AppError('Your current password is incorrect', 401));
    }
    
    // Update password
    await User.update(user.id, { password: newPassword });
    
    // Log user in, send JWT
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
}; 
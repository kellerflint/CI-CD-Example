const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const projectRoutes = require('./projectRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running' });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/subscriptions', subscriptionRoutes);

module.exports = router; 
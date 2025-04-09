const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Subscription routes
router.get('/plans', subscriptionController.getPlans);
router.get('/my-subscription', subscriptionController.getMySubscription);
router.post('/create-checkout-session', subscriptionController.createCheckoutSession);
router.post('/cancel', subscriptionController.cancelSubscription);
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook);

module.exports = router; 
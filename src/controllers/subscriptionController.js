const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { AppError } = require('../middleware/errorHandler');
const Subscription = require('../models/subscription');
const User = require('../models/user');
const logger = require('../utils/logger');

// Define subscription plans
const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    description: 'Up to 5 projects and 20 tasks per project',
    price_id: process.env.NODE_ENV === 'production' 
      ? 'price_live_basic_placeholder'
      : 'price_test_basic_placeholder',
    price: 9.99,
    features: [
      'Up to 5 projects',
      '20 tasks per project',
      'Basic reporting',
      'Email support'
    ]
  },
  premium: {
    name: 'Premium',
    description: 'Up to 20 projects and unlimited tasks',
    price_id: process.env.NODE_ENV === 'production'
      ? 'price_live_premium_placeholder'
      : 'price_test_premium_placeholder',
    price: 19.99,
    features: [
      'Up to 20 projects',
      'Unlimited tasks',
      'Advanced reporting',
      'Priority email support',
      'Team collaboration'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Unlimited projects and tasks with premium support',
    price_id: process.env.NODE_ENV === 'production'
      ? 'price_live_enterprise_placeholder'
      : 'price_test_enterprise_placeholder',
    price: 49.99,
    features: [
      'Unlimited projects',
      'Unlimited tasks',
      'Custom reporting',
      'Dedicated support',
      'Advanced team collaboration',
      'API access'
    ]
  }
};

// Get available subscription plans
exports.getPlans = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        plans: SUBSCRIPTION_PLANS
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user's subscription
exports.getMySubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByUserId(req.user.id);
    
    if (!subscription) {
      return next(new AppError('No subscription found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        subscription
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a checkout session for subscription
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { plan } = req.body;
    
    if (!SUBSCRIPTION_PLANS[plan]) {
      return next(new AppError('Invalid subscription plan', 400));
    }
    
    const user = await User.findById(req.user.id);
    const userSubscription = await Subscription.findByUserId(user.id);
    
    // If user doesn't have a Stripe customer ID, create one
    let stripeCustomerId;
    if (!userSubscription || !userSubscription.stripe_customer_id) {
      const customer = await Subscription.createStripeCustomer(user);
      stripeCustomerId = customer.id;
      
      // Create or update subscription record
      if (!userSubscription) {
        await Subscription.create({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          plan: 'free',
          status: 'active'
        });
      } else {
        await Subscription.update(userSubscription.id, {
          stripe_customer_id: stripeCustomerId
        });
      }
    } else {
      stripeCustomerId = userSubscription.stripe_customer_id;
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: SUBSCRIPTION_PLANS[plan].price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId: user.id,
        plan
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    next(error);
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByUserId(req.user.id);
    
    if (!subscription) {
      return next(new AppError('No active subscription found', 404));
    }
    
    if (!subscription.stripe_subscription_id) {
      return next(new AppError('No Stripe subscription found', 400));
    }
    
    // Cancel at period end
    await Subscription.cancelStripeSubscription(subscription.stripe_subscription_id);
    
    // Update local subscription
    await Subscription.update(subscription.id, {
      cancel_at_period_end: true
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Subscription will be canceled at the end of the billing period'
    });
  } catch (error) {
    next(error);
  }
};

// Handle Stripe webhook events
exports.handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Webhook error: ${error.message}`);
    next(error);
  }
};

// Helper functions for webhook handling
async function handleCheckoutSessionCompleted(session) {
  try {
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;
    const subscriptionId = session.subscription;
    
    // Get subscription details from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Find user's subscription
    const userSubscription = await Subscription.findByUserId(userId);
    
    if (userSubscription) {
      // Update existing subscription
      await Subscription.update(userSubscription.id, {
        stripe_subscription_id: subscriptionId,
        plan,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end
      });
    } else {
      // Create new subscription
      await Subscription.create({
        user_id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: subscriptionId,
        plan,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end
      });
    }
    
    logger.info(`Subscription created/updated for user ${userId}`);
  } catch (error) {
    logger.error(`Error handling checkout.session.completed: ${error.message}`);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    await Subscription.updateSubscriptionFromStripe(subscription);
    logger.info(`Subscription ${subscription.id} updated`);
  } catch (error) {
    logger.error(`Error handling customer.subscription.updated: ${error.message}`);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const userSubscription = await Subscription.findByStripeSubscriptionId(subscription.id);
    
    if (userSubscription) {
      await Subscription.update(userSubscription.id, {
        status: 'canceled',
        cancel_at_period_end: false
      });
      
      logger.info(`Subscription ${subscription.id} marked as canceled`);
    }
  } catch (error) {
    logger.error(`Error handling customer.subscription.deleted: ${error.message}`);
  }
} 
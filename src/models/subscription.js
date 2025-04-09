const db = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class Subscription {
  static async findById(id) {
    return db('subscriptions').where({ id }).first();
  }

  static async findByUserId(userId) {
    return db('subscriptions').where({ user_id: userId }).first();
  }

  static async findByStripeSubscriptionId(stripeSubscriptionId) {
    return db('subscriptions').where({ stripe_subscription_id: stripeSubscriptionId }).first();
  }

  static async create(subscriptionData) {
    const [subscription] = await db('subscriptions').insert({
      user_id: subscriptionData.user_id,
      stripe_customer_id: subscriptionData.stripe_customer_id,
      stripe_subscription_id: subscriptionData.stripe_subscription_id,
      status: subscriptionData.status || 'trialing',
      plan: subscriptionData.plan || 'free',
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
      cancel_at_period_end: subscriptionData.cancel_at_period_end || false
    }).returning('*');
    
    return subscription;
  }

  static async update(id, subscriptionData) {
    const [updatedSubscription] = await db('subscriptions')
      .where({ id })
      .update(subscriptionData)
      .returning('*');
      
    return updatedSubscription;
  }

  static async delete(id) {
    return db('subscriptions').where({ id }).del();
  }

  static async createStripeCustomer(user) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      metadata: {
        userId: user.id
      }
    });
    
    return customer;
  }

  static async createStripeSubscription(customerId, priceId) {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent']
    });
    
    return subscription;
  }

  static async cancelStripeSubscription(stripeSubscriptionId) {
    return stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true
    });
  }

  static async updateSubscriptionFromStripe(stripeSubscription) {
    const subscription = await this.findByStripeSubscriptionId(stripeSubscription.id);
    
    if (!subscription) {
      return null;
    }
    
    return this.update(subscription.id, {
      status: stripeSubscription.status,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000),
      cancel_at_period_end: stripeSubscription.cancel_at_period_end
    });
  }
}

module.exports = Subscription; 
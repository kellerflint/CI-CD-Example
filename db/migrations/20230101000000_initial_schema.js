/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Users table
    .createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('email').notNullable().unique();
      table.string('password').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.enum('role', ['user', 'admin']).defaultTo('user');
      table.string('reset_password_token');
      table.timestamp('reset_password_expires');
      table.timestamp('password_changed_at');
      table.timestamps(true, true);
    })
    
    // Subscriptions table
    .createTable('subscriptions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('stripe_customer_id');
      table.string('stripe_subscription_id');
      table.enum('status', ['active', 'canceled', 'past_due', 'trialing']).defaultTo('trialing');
      table.enum('plan', ['free', 'basic', 'premium', 'enterprise']).defaultTo('free');
      table.timestamp('current_period_start');
      table.timestamp('current_period_end');
      table.boolean('cancel_at_period_end').defaultTo(false);
      table.timestamps(true, true);
    })
    
    // Projects table
    .createTable('projects', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.text('description');
      table.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE');
      table.timestamps(true, true);
    })
    
    // Project members table
    .createTable('project_members', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.enum('role', ['viewer', 'member', 'admin']).defaultTo('member');
      table.timestamps(true, true);
      table.unique(['project_id', 'user_id']);
    })
    
    // Tasks table
    .createTable('tasks', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('title').notNullable();
      table.text('description');
      table.uuid('project_id').references('id').inTable('projects').onDelete('CASCADE');
      table.uuid('assignee_id').references('id').inTable('users').onDelete('SET NULL');
      table.uuid('created_by').references('id').inTable('users').onDelete('CASCADE');
      table.enum('status', ['todo', 'in_progress', 'review', 'done']).defaultTo('todo');
      table.enum('priority', ['low', 'medium', 'high', 'urgent']).defaultTo('medium');
      table.timestamp('due_date');
      table.timestamps(true, true);
    })
    
    // Comments table
    .createTable('comments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.text('content').notNullable();
      table.uuid('task_id').references('id').inTable('tasks').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('comments')
    .dropTableIfExists('tasks')
    .dropTableIfExists('project_members')
    .dropTableIfExists('projects')
    .dropTableIfExists('subscriptions')
    .dropTableIfExists('users');
}; 
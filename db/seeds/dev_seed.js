const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('comments').del();
  await knex('tasks').del();
  await knex('project_members').del();
  await knex('projects').del();
  await knex('subscriptions').del();
  await knex('users').del();
  
  // Create users
  const users = await knex('users').insert([
    {
      email: 'admin@taskify.com',
      password: await bcrypt.hash('password123', 10),
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin'
    },
    {
      email: 'john@example.com',
      password: await bcrypt.hash('password123', 10),
      first_name: 'John',
      last_name: 'Doe',
      role: 'user'
    },
    {
      email: 'jane@example.com',
      password: await bcrypt.hash('password123', 10),
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'user'
    }
  ]).returning('*');
  
  // Create subscriptions
  await knex('subscriptions').insert([
    {
      user_id: users[0].id,
      stripe_customer_id: 'cus_mock_admin',
      stripe_subscription_id: 'sub_mock_admin',
      status: 'active',
      plan: 'enterprise',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    },
    {
      user_id: users[1].id,
      stripe_customer_id: 'cus_mock_john',
      stripe_subscription_id: 'sub_mock_john',
      status: 'active',
      plan: 'premium',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      user_id: users[2].id,
      stripe_customer_id: 'cus_mock_jane',
      stripe_subscription_id: 'sub_mock_jane',
      status: 'active',
      plan: 'basic',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  ]);
  
  // Create projects
  const projects = await knex('projects').insert([
    {
      name: 'Website Redesign',
      description: 'Redesign the company website with modern UI/UX',
      owner_id: users[0].id
    },
    {
      name: 'Mobile App Development',
      description: 'Develop a mobile app for iOS and Android',
      owner_id: users[1].id
    },
    {
      name: 'Marketing Campaign',
      description: 'Q3 marketing campaign for new product launch',
      owner_id: users[2].id
    }
  ]).returning('*');
  
  // Add project members
  await knex('project_members').insert([
    {
      project_id: projects[0].id,
      user_id: users[0].id,
      role: 'admin'
    },
    {
      project_id: projects[0].id,
      user_id: users[1].id,
      role: 'member'
    },
    {
      project_id: projects[0].id,
      user_id: users[2].id,
      role: 'viewer'
    },
    {
      project_id: projects[1].id,
      user_id: users[1].id,
      role: 'admin'
    },
    {
      project_id: projects[1].id,
      user_id: users[0].id,
      role: 'member'
    },
    {
      project_id: projects[2].id,
      user_id: users[2].id,
      role: 'admin'
    },
    {
      project_id: projects[2].id,
      user_id: users[0].id,
      role: 'member'
    }
  ]);
  
  // Create tasks
  const tasks = await knex('tasks').insert([
    {
      title: 'Design homepage mockup',
      description: 'Create a mockup for the new homepage design',
      project_id: projects[0].id,
      assignee_id: users[1].id,
      created_by: users[0].id,
      status: 'in_progress',
      priority: 'high',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    {
      title: 'Implement user authentication',
      description: 'Set up user authentication with JWT',
      project_id: projects[0].id,
      assignee_id: users[2].id,
      created_by: users[0].id,
      status: 'todo',
      priority: 'medium',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
    },
    {
      title: 'Create API endpoints',
      description: 'Develop RESTful API endpoints for the mobile app',
      project_id: projects[1].id,
      assignee_id: users[0].id,
      created_by: users[1].id,
      status: 'todo',
      priority: 'high',
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
    },
    {
      title: 'Design social media graphics',
      description: 'Create graphics for social media campaign',
      project_id: projects[2].id,
      assignee_id: users[2].id,
      created_by: users[2].id,
      status: 'done',
      priority: 'medium',
      due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    }
  ]).returning('*');
  
  // Create comments
  await knex('comments').insert([
    {
      content: 'I think we should use a blue color scheme for this.',
      task_id: tasks[0].id,
      user_id: users[0].id
    },
    {
      content: 'I prefer a more minimalist approach.',
      task_id: tasks[0].id,
      user_id: users[1].id
    },
    {
      content: 'Let\'s use JWT for authentication.',
      task_id: tasks[1].id,
      user_id: users[2].id
    },
    {
      content: 'API endpoints should follow RESTful conventions.',
      task_id: tasks[2].id,
      user_id: users[1].id
    },
    {
      content: 'The graphics look great! Approved.',
      task_id: tasks[3].id,
      user_id: users[0].id
    }
  ]);
}; 
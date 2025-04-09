const request = require('supertest');
const app = require('../../src/server');
const db = require('../../src/config/database');
const User = require('../../src/models/user');
const Project = require('../../src/models/project');
const Subscription = require('../../src/models/subscription');

describe('Project E2E Tests', () => {
  let token;
  let userId;
  let projectId;

  beforeAll(async () => {
    // Run migrations
    await db.migrate.latest();
    
    // Clean up tables
    await db('project_members').del();
    await db('projects').del();
    await db('subscriptions').del();
    await db('users').del();
    
    // Create a test user
    const user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User'
    });
    
    userId = user.id;
    
    // Create a subscription for the user
    await Subscription.create({
      user_id: userId,
      stripe_customer_id: 'cus_test123',
      stripe_subscription_id: 'sub_test123',
      plan: 'premium',
      status: 'active',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });
    
    // Login to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    token = response.body.token;
  });

  afterAll(async () => {
    // Clean up
    await db('project_members').del();
    await db('projects').del();
    await db('subscriptions').del();
    await db('users').del();
    
    // Close database connection
    await db.destroy();
  });

  describe('Project CRUD Operations', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'This is a test project'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.project).toBeDefined();
      expect(response.body.data.project.name).toBe(projectData.name);
      expect(response.body.data.project.description).toBe(projectData.description);
      expect(response.body.data.project.owner_id).toBe(userId);

      // Save project ID for later tests
      projectId = response.body.data.project.id;
    });

    it('should get all projects for the user', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.projects).toBeDefined();
      expect(Array.isArray(response.body.data.projects)).toBe(true);
      expect(response.body.data.projects.length).toBeGreaterThan(0);
      expect(response.body.data.projects[0].name).toBe('Test Project');
    });

    it('should get a specific project by ID', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.project).toBeDefined();
      expect(response.body.data.project.id).toBe(projectId);
      expect(response.body.data.project.name).toBe('Test Project');
    });

    it('should update a project', async () => {
      const updateData = {
        name: 'Updated Project',
        description: 'This project has been updated'
      };

      const response = await request(app)
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.project).toBeDefined();
      expect(response.body.data.project.name).toBe(updateData.name);
      expect(response.body.data.project.description).toBe(updateData.description);
    });

    it('should get project members', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.members).toBeDefined();
      expect(Array.isArray(response.body.data.members)).toBe(true);
      expect(response.body.data.members.length).toBe(1); // Only the owner
      expect(response.body.data.members[0].email).toBe('test@example.com');
      expect(response.body.data.members[0].role).toBe('admin');
    });
  });

  describe('Project Member Management', () => {
    let secondUserId;

    beforeAll(async () => {
      // Create another test user
      const secondUser = await User.create({
        email: 'member@example.com',
        password: 'password123',
        first_name: 'Team',
        last_name: 'Member'
      });
      
      secondUserId = secondUser.id;
    });

    it('should add a member to the project', async () => {
      const memberData = {
        userId: secondUserId,
        role: 'member'
      };

      const response = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send(memberData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.member).toBeDefined();
      expect(response.body.data.member.user_id).toBe(secondUserId);
      expect(response.body.data.member.project_id).toBe(projectId);
      expect(response.body.data.member.role).toBe('member');
    });

    it('should update a member\'s role', async () => {
      const updateData = {
        role: 'viewer'
      };

      const response = await request(app)
        .patch(`/api/projects/${projectId}/members/${secondUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.member).toBeDefined();
      expect(response.body.data.member.role).toBe('viewer');
    });

    it('should remove a member from the project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${projectId}/members/${secondUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });
  });

  describe('Project Deletion', () => {
    it('should delete a project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });

    it('should return 404 when trying to access a deleted project', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Project not found');
    });
  });
}); 
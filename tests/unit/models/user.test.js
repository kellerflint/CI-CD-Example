const bcrypt = require('bcryptjs');
const User = require('../../../src/models/user');
const db = require('../../../src/config/database');

// Mock the database
jest.mock('../../../src/config/database', () => ({
  where: jest.fn().mockReturnThis(),
  first: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  update: jest.fn().mockReturnThis(),
  del: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a user by id', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      db.where.mockReturnThis();
      db.first.mockResolvedValue(mockUser);

      const result = await User.findById('123');

      expect(db.where).toHaveBeenCalledWith({ id: '123' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      db.where.mockReturnThis();
      db.first.mockResolvedValue(mockUser);

      const result = await User.findByEmail('test@example.com');

      expect(db.where).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      };
      const mockUser = { id: '123', ...userData, password: 'hashedPassword' };
      
      db.insert.mockReturnThis();
      db.returning.mockResolvedValue([mockUser]);

      const result = await User.create(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(db.insert).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashedPassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update user data', async () => {
      const userData = {
        first_name: 'Updated',
        last_name: 'User',
      };
      const mockUser = { id: '123', ...userData };
      
      db.where.mockReturnThis();
      db.update.mockReturnThis();
      db.returning.mockResolvedValue([mockUser]);

      const result = await User.update('123', userData);

      expect(db.where).toHaveBeenCalledWith({ id: '123' });
      expect(db.update).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockUser);
    });

    it('should hash password if included in update data', async () => {
      const userData = {
        password: 'newpassword',
      };
      const mockUser = { id: '123', password: 'hashedPassword' };
      
      db.where.mockReturnThis();
      db.update.mockReturnThis();
      db.returning.mockResolvedValue([mockUser]);

      const result = await User.update('123', userData);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(db.update).toHaveBeenCalledWith({
        password: 'hashedPassword',
        password_changed_at: expect.any(Date),
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      db.where.mockReturnThis();
      db.del.mockResolvedValue(1);

      const result = await User.delete('123');

      expect(db.where).toHaveBeenCalledWith({ id: '123' });
      expect(db.del).toHaveBeenCalled();
      expect(result).toBe(1);
    });
  });

  describe('comparePassword', () => {
    it('should compare passwords correctly', async () => {
      const result = await User.comparePassword('password123', 'hashedPassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(result).toBe(true);
    });
  });

  describe('changedPasswordAfter', () => {
    it('should return false if password was not changed after token was issued', async () => {
      const user = {
        password_changed_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      };
      const timestamp = Math.floor(Date.now() / 1000); // current time in seconds

      const result = await User.changedPasswordAfter(user, timestamp);

      expect(result).toBe(false);
    });

    it('should return true if password was changed after token was issued', async () => {
      const user = {
        password_changed_at: new Date(Date.now() + 1000 * 60 * 60), // 1 hour in future
      };
      const timestamp = Math.floor(Date.now() / 1000); // current time in seconds

      const result = await User.changedPasswordAfter(user, timestamp);

      expect(result).toBe(true);
    });

    it('should return false if password_changed_at does not exist', async () => {
      const user = {};
      const timestamp = Math.floor(Date.now() / 1000);

      const result = await User.changedPasswordAfter(user, timestamp);

      expect(result).toBe(false);
    });
  });
}); 
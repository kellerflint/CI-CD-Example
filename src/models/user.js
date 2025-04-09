const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async findById(id) {
    return db('users').where({ id }).first();
  }

  static async findByEmail(email) {
    return db('users').where({ email }).first();
  }

  static async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const [user] = await db('users').insert({
      email: userData.email,
      password: hashedPassword,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role || 'user'
    }).returning('*');
    
    return user;
  }

  static async update(id, userData) {
    const updateData = { ...userData };
    
    // Hash password if it's being updated
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
      updateData.password_changed_at = new Date();
    }
    
    const [updatedUser] = await db('users')
      .where({ id })
      .update(updateData)
      .returning('*');
      
    return updatedUser;
  }

  static async delete(id) {
    return db('users').where({ id }).del();
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  static async getSubscription(userId) {
    return db('subscriptions').where({ user_id: userId }).first();
  }

  static async changedPasswordAfter(user, timestamp) {
    if (user.password_changed_at) {
      const changedTimestamp = parseInt(
        user.password_changed_at.getTime() / 1000,
        10
      );
      return timestamp < changedTimestamp;
    }
    return false;
  }
}

module.exports = User; 
const db = require('../config/database');

class Project {
  static async findById(id) {
    return db('projects').where({ id }).first();
  }

  static async findByUser(userId) {
    return db('projects')
      .join('project_members', 'projects.id', 'project_members.project_id')
      .where('project_members.user_id', userId)
      .orWhere('projects.owner_id', userId)
      .select('projects.*')
      .distinct();
  }

  static async create(projectData) {
    const [project] = await db('projects').insert({
      name: projectData.name,
      description: projectData.description,
      owner_id: projectData.owner_id,
    }).returning('*');
    
    // Add owner as admin member
    await db('project_members').insert({
      project_id: project.id,
      user_id: projectData.owner_id,
      role: 'admin'
    });
    
    return project;
  }

  static async update(id, projectData) {
    const [updatedProject] = await db('projects')
      .where({ id })
      .update(projectData)
      .returning('*');
      
    return updatedProject;
  }

  static async delete(id) {
    return db('projects').where({ id }).del();
  }

  static async getMembers(projectId) {
    return db('project_members')
      .join('users', 'project_members.user_id', 'users.id')
      .where('project_members.project_id', projectId)
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'project_members.role'
      );
  }

  static async addMember(projectId, userId, role = 'member') {
    const [member] = await db('project_members').insert({
      project_id: projectId,
      user_id: userId,
      role
    }).returning('*');
    
    return member;
  }

  static async updateMemberRole(projectId, userId, role) {
    const [updatedMember] = await db('project_members')
      .where({
        project_id: projectId,
        user_id: userId
      })
      .update({ role })
      .returning('*');
      
    return updatedMember;
  }

  static async removeMember(projectId, userId) {
    return db('project_members')
      .where({
        project_id: projectId,
        user_id: userId
      })
      .del();
  }

  static async checkUserAccess(projectId, userId, roles = ['admin', 'member', 'viewer']) {
    // Check if user is the owner
    const project = await this.findById(projectId);
    if (!project) {
      return false;
    }
    
    if (project.owner_id === userId) {
      return true;
    }
    
    // Check if user is a member with appropriate role
    const member = await db('project_members')
      .where({
        project_id: projectId,
        user_id: userId
      })
      .first();
      
    if (!member) {
      return false;
    }
    
    return roles.includes(member.role);
  }
}

module.exports = Project; 
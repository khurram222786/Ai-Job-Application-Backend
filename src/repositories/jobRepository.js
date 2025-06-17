const { Job, User, Application, Document, Interview } = require("../models");
const { Op } = require("sequelize");

module.exports = {
  async createJob(jobData) {
    return await Job.create(jobData);
  },

  async findJobById(id) {
    return await Job.findByPk(id);
  },

  async findAndCountJobs(queryOptions) {
    return await Job.findAndCountAll({
      ...queryOptions,
      include: [
        {
          model: User.scope(null),
          attributes: ['username', 'email','profile_picture'],
          required: false,
        },
      ],
      raw: false,
      nest: true,
    });
  },
  
  async updateJob(job, updateData) {
    return await job.update(updateData);
  },

  async deleteJob(job) {
    return await job.destroy();
  },

  async findUserById(userId) {
    return await User.findByPk(userId);
  },
  
  async findAppliedJobIds(userId) {
    const applications = await Application.findAll({
      where: { user_id: userId },
      attributes: ['job_id'],
      raw: true
    });
    return applications.map(app => app.job_id);
  }

  
};

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
    return await Job.findAndCountAll(queryOptions);
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
};

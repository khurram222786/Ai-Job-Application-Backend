const { application } = require("express");
const { Application, Job, User, Document } = require("../models");

module.exports = {
  async findJobWithOwner(jobId, userId) {
    return await Job.findOne({
      where: {
        id: jobId,
        user_id: userId,
      },
    });
  },

  async findApplicationsForJob(jobId) {
    return await Application.findAndCountAll({
      where: { job_id: jobId },
      attributes: ["id", "status"],
      include: [
        {
          model: User,
          attributes: ["user_id", "username", "email"],
          include: [
            {
              model: Document,
              attributes: ["file_url", "file_name"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  },

  async findApplicationWithJobOwner(applicationId, userId) {
    return await Application.findOne({
      where: { id: applicationId },
      include: [
        {
          model: Job,
          where: { user_id: userId },
        },
      ],
    });
  },

  async updateApplicationStatus(application, status) {
    return await application.update({ status: status.toLowerCase() });
  },

  async findApplicationsByStatusAndJobOwner(status, userId) {
    return await Application.findAll({
      where: { status },
      include: [
        {
          model: Job,
          where: { user_id: userId },
          attributes: [],
        },
        {
          model: User,
          attributes: ["user_id", "username", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  },
  async findJobById(jobId) {
    return await Job.findByPk(jobId);
  },

  async findUserApplication(userId, jobId) {
    return await Application.findOne({
      where: { user_id: userId, job_id: jobId },
    });
  },
  

  async createApplication(applicationData) {
    return await Application.create(applicationData);
  },
};

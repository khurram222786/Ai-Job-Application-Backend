const { Application, Job, User, Document } = require('../models');

module.exports = {
  async findJobWithOwner(jobId, userId) {
    return await Job.findOne({
      where: {
        id: jobId,
        user_id: userId
      }
    });
  },

  async findApplicationsForJob(jobId) {
    return await Application.findAndCountAll({
      where: { job_id: jobId },
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'email'],
          include: [
            {
              model: Document,
              attributes: ['file_url', 'file_name']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  },

  async findApplicationWithJobOwner(applicationId, userId) {
    return await Application.findOne({
      where: { id: applicationId },
      include: [
        {
          model: Job,
          where: { user_id: userId }
        }
      ]
    });
  },

  async updateApplicationStatus(application, status) {
    return await application.update({ status: status.toLowerCase() });
  }
};
const { SavedJob, Job, User } = require("../models");
const { Op } = require("sequelize");

class SavedJobRepository {
  async saveJob(userId, jobId) {
    return await SavedJob.create({
      user_id: userId,
      job_id: jobId
    });
  }

  async unsaveJob(userId, jobId) {
    return await SavedJob.destroy({
      where: {
        user_id: userId,
        job_id: jobId
      }
    });
  }

  async findSavedJob(userId, jobId) {
    return await SavedJob.findOne({
      where: {
        user_id: userId,
        job_id: jobId
      }
    });
  }

  async getUserSavedJobs(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    return await SavedJob.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: Job,
          as: 'Job',
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['username', 'email']
            }
          ]
        }
      ],
      order: [['saved_at', 'DESC']],
      limit,
      offset
    });
  }

  async getSavedJobIds(userId) {
    const savedJobs = await SavedJob.findAll({
      where: { user_id: userId },
      attributes: ['job_id']
    });
    return savedJobs.map(savedJob => savedJob.job_id);
  }

  async checkIfJobSaved(userId, jobId) {
    const savedJob = await this.findSavedJob(userId, jobId);
    return !!savedJob;
  }
}

module.exports = new SavedJobRepository(); 
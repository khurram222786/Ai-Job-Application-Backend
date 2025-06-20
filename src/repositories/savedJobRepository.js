const { SavedJob, Job, User, Application } = require("../models");
const { Op, where } = require("sequelize");

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


  async getUserSavedJobs(userId, page = 1, limit = 10, appliedID) {
    const offset = (page - 1) * limit;
    const whereClause = { user_id: userId };
    if (appliedID && Array.isArray(appliedID) && appliedID.length > 0) {
      whereClause.job_id = { [Op.notIn]: appliedID };
    }
    return await SavedJob.findAndCountAll({
      where: whereClause,
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

  async getAllUserAppliedJobIds(userid) {
    const applications = await Application.findAll({
      where: { user_id: userid },
      attributes: ['job_id']
    });
    return applications.map(app => app.job_id);
  }
}

module.exports = new SavedJobRepository(); 
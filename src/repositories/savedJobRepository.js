const { SavedJob, Job, User, Application } = require("../models");
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
  
  async getAllUserAppliedJobIds(userid) {
    const applications = await Application.findAll({
      where: { user_id: userid },
      attributes: ['job_id']
    });
    return applications.map(app => app.job_id);
  }

  async getUserSavedJobs(userId, page = 1, limit = 10, appliedJobs) {
    const offset = (page - 1) * limit;
    const savedjobs = await SavedJob.findAndCountAll({
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
    // Filter out jobs whose job_id is in appliedJobs
    let filteredRows = savedjobs.rows;
    if (appliedJobs && Array.isArray(appliedJobs) && appliedJobs.length > 0) {
      filteredRows = savedjobs.rows.filter(saved => !appliedJobs.includes(saved.job_id));
    }
    return {
      count: filteredRows.length,
      rows: filteredRows
    };
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
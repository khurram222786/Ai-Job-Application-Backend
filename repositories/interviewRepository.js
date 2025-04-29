const { Interview, User, Application } = require('../models');
const { Op } = require('sequelize');

module.exports = {
  async findConflictingInterview(userId, interviewDate, startTime, endTime) {
    return await Interview.findOne({
      where: {
        user_id: userId,
        interview_date: interviewDate,
        [Op.or]: [
          {
            start_time: { [Op.lt]: endTime },
            end_time: { [Op.gt]: startTime }
          }
        ]
      }
    });
  },

  async createInterview(interviewData) {
    return await Interview.create(interviewData);
  },
  

  async getInterviewDetails(interviewId) {
    return await Interview.findByPk(interviewId, {
      include: [
        { model: User, attributes: ['user_id', 'username', 'email'] },
        { model: Application, attributes: ['id', 'status'] }
      ]
    });
  }
};
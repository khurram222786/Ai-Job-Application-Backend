const { Interview, User, Application, Job } = require("../models");
const { Op } = require("sequelize");

module.exports = {
  async findConflictingInterview(userId, interviewDate, startTime, endTime) {
    return await Interview.findOne({
      where: {
        user_id: userId,
        interview_date: interviewDate,
        [Op.or]: [
          {
            start_time: { [Op.lt]: endTime },
            end_time: { [Op.gt]: startTime },
          },
        ],
      },
    });
  },
  async findInterviewById(id) {
    return await Interview.findByPk(id);
  },

  async createInterview(interviewData) {
    return await Interview.create(interviewData);
  },

  async getInterviewDetails(interviewId) {
    return await Interview.findByPk(interviewId, {
      include: [
        { model: User, attributes: ["user_id", "username", "email"] },
        { model: Application, attributes: ["id", "status"] },
      ],
    });
  },
  
  async getUserInterviews(userId) {
  return await Interview.findAll({
    where: { user_id: userId },
    attributes: ["id", "start_time", "end_time", "interview_date", "user_id"],
    include: [
      {
        model: Application,
        attributes: ["job_id"],
        include: [
          {
            model: Job,
            attributes: ["title", "description", "requirements", "skills", "user_id"]
          }
        ]
      }
    ],
    order: [["interview_date", "ASC"]],
  });
}

};

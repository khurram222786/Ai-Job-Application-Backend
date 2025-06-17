const { User, Application, UserType, Document, Interview, Job } = require("../models");
const { Op, Sequelize } = require('sequelize');

module.exports = {
  async findUserByEmail(email) {
    return await User.findOne({
      where: { email },
      include: {
        model: UserType,
        as: "UserType",
        attributes: ["role"],
      },
    });
  },
  async findUserWithApplications(userId, applicationId) {
    return await User.findOne({
      where: { user_id: userId },
      include: [
        {
          model: Application,
          where: { id: applicationId },
          required: false,
        },
      ],
    });
  },

  async createUser(userData) {
    return await User.create(userData);
  },

  async findUserbyId(id){
    return await User.findByPk(id);
  },

  async findUserTypeByRole(role) {
    return await UserType.findOne({ where: { role } });
  },

  async userExists(email) {
    const count = await User.count({ where: { email } });
    return count > 0;
  },
  async findUserById(userId, options = {}) {
    return await User.findByPk(userId, {
      ...options,
      include: {
        model: UserType,
        as: "UserType",
        attributes: ["role"],
      },
    });
  },

  async findUserDetailsById(userId) {
    try {
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password', 'cv_url'] },
            include: [{
                model: Document,
                as: 'Documents',
                attributes: ['file_url', 'file_name']
            }]
        });
        console.log('User with documents:', JSON.stringify(user, null, 2));
        return user;
    } catch (error) {
        console.error('Error fetching user details:', error);
        throw error;
    }
},

  async updateUserProfilePicture(userId, profilePictureUrl) {
    const [affectedCount] = await User.update(
      { profile_picture: profilePictureUrl },
      { where: { user_id: userId } }
    );
    
    if (affectedCount === 0) {
      throw new Error("User not found or no changes made");
    }
    
    return await this.findUserById(userId);
  },

  async getUserProfilePicture(userId) {
    const user = await User.findByPk(userId, {
      attributes: ['profile_picture']
    });
    return user ? user.profile_picture : null;
  },

  async findUserByUserId(userId) {
    return await UserType.findByPk(userId);
  },

  async getUserStatistics(userId) {
  try {
    const [applicationCount, scheduledInterviewCount, availableJobs] = await Promise.all([
      // Count total applications by the user
      Application.count({
        where: { user_id: userId }
      }),

      // Count interviews scheduled for the user
      Interview.count({
        where: {
          user_id: userId,
          progress: 'scheduled'
        }
      }),

      // Get available jobs (exclude ones the user has applied to)
      Job.count({
        where: {
          id: {
            [Op.notIn]: Sequelize.literal(`(
              SELECT "job_id" FROM "Applications" WHERE "user_id" = ${userId}
            )`)
          }
        }
      })
    ]);

    return {
      user_id: userId,
      total_applications: applicationCount,
      scheduled_interviews: scheduledInterviewCount,
      available_jobs: availableJobs
    };
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
}

 
};

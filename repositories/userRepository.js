const { User,Application  ,UserType } = require('../models');

module.exports = {
  async findUserByEmail(email) {
    return await User.findOne({ 
      where: { email },
      include: {
        model: UserType,
        as: 'UserType',
        attributes: ['role']
      }
    });
  },
  async findUserWithApplications(userId, applicationId) {
    return await User.findOne({
      where: { user_id: userId },
      include: [{
        model: Application,
        where: { id: applicationId },
        required: false
      }]
    });
  },

  async createUser(userData) {
    return await User.create(userData);
  },

  async findUserTypeByRole(role) {
    return await UserType.findOne({ where: { role } });
  },

  async userExists(email) {
    const count = await User.count({ where: { email } });
    return count > 0;
  }
};
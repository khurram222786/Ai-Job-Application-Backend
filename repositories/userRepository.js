const { User, Application, UserType, Document } = require("../models");

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
};

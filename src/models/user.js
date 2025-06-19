const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    cv_url: DataTypes.STRING,
    user_type_id: DataTypes.INTEGER
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  User.associate = function(models) {
    User.belongsTo(models.UserType, { 
      foreignKey: 'user_type_id',
      as: 'UserType' // This alias is important for the include in login
    });
    User.hasMany(models.Document, { foreignKey: 'user_id' });
    User.hasMany(models.Job, { foreignKey: 'user_id' });
    User.hasMany(models.Application, { foreignKey: 'user_id' });
    User.hasMany(models.Interview, { foreignKey: 'user_id' });
    User.hasMany(models.Media, { foreignKey: 'user_id' });
    User.hasMany(models.SavedJob, { foreignKey: 'user_id', as: 'SavedJobs' });
  };

  // Add password validation method
  User.prototype.validPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  return User;
};
module.exports = (sequelize, DataTypes) => {
  const UserType = sequelize.define('UserType', {
    role: DataTypes.STRING
  }, {});

  UserType.associate = function(models) {
    UserType.hasMany(models.User, { foreignKey: 'user_type_id' });
  };
  return UserType;
};
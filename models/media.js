module.exports = (sequelize, DataTypes) => {
  const Media = sequelize.define('Media', {
    interview_url: DataTypes.STRING,
    user_id: DataTypes.INTEGER,
    interview_id: DataTypes.INTEGER
  }, {});

  Media.associate = function(models) {
    Media.belongsTo(models.User, { foreignKey: 'user_id' });
    Media.belongsTo(models.Interview, { foreignKey: 'interview_id' });
    Media.hasMany(models.Application, { foreignKey: 'media_id' });
  };
  return Media;
};
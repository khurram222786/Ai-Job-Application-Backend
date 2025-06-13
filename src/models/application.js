module.exports = (sequelize, DataTypes) => {
  const Application = sequelize.define('Application', {
    status: DataTypes.STRING,
    user_id: DataTypes.INTEGER,
    job_id: DataTypes.INTEGER,
    media_id: DataTypes.INTEGER
  }, {});

  Application.associate = function(models) {
    Application.belongsTo(models.User, { foreignKey: 'user_id' });
    Application.belongsTo(models.Job, { foreignKey: 'job_id' });
    Application.belongsTo(models.Media, { foreignKey: 'media_id' });
    Application.hasMany(models.Interview, { foreignKey: 'application_id' });
  };
  return Application;
};
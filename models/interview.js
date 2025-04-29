module.exports = (sequelize, DataTypes) => {
  const Interview = sequelize.define('Interview', {
    start_time: DataTypes.TIME,
    end_time: DataTypes.TIME,
    interview_date: DataTypes.DATEONLY,
    application_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    media_id: DataTypes.INTEGER
  }, {});

  Interview.associate = function(models) {
    Interview.belongsTo(models.Application, { foreignKey: 'application_id' });
    Interview.belongsTo(models.User, { foreignKey: 'user_id' });
    Interview.belongsTo(models.Media, { foreignKey: 'media_id' });
    Interview.hasOne(models.InterviewConversation, { foreignKey: 'interview_id' });
  };

  return Interview;
};
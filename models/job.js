module.exports = (sequelize, DataTypes) => {
  const Job = sequelize.define('Job', {
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    requirements: DataTypes.TEXT,
    user_id: DataTypes.INTEGER,
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    }
  }, {});

  Job.associate = function(models) {
    Job.belongsTo(models.User, { foreignKey: 'user_id' });
    Job.hasMany(models.Application, { foreignKey: 'job_id' });
  };
  return Job;
};
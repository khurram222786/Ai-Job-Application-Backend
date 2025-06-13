module.exports = (sequelize, DataTypes) => {
  const Job = sequelize.define('Job', {
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    requirements: DataTypes.TEXT,
    responsibilities: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    salary: {
      type: DataTypes.STRING, // or INTEGER/FLOAT based on your app
      allowNull: true,
    },
    user_id: DataTypes.INTEGER,
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    working_hours: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    job_type: {
      type: DataTypes.STRING, // e.g., 'remote', 'on-site', 'hybrid'
      allowNull: true,
    },
    employment_type: {
      type: DataTypes.STRING, // e.g., 'full-time', 'part-time'
      allowNull: true,
    },
  }, {});

  Job.associate = function(models) {
    Job.belongsTo(models.User, { foreignKey: 'user_id', targetKey: 'user_id' });
    Job.hasMany(models.Application, { foreignKey: 'job_id' });
  };

  return Job;
};

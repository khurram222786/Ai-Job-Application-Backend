module.exports = (sequelize, DataTypes) => {
  const SavedJob = sequelize.define('SavedJob', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'user_id'
      }
    },
    job_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Jobs',
        key: 'id'
      }
    },
    saved_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'SavedJobs',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'job_id']
      }
    ]
  });

  SavedJob.associate = function(models) {
    SavedJob.belongsTo(models.User, { 
      foreignKey: 'user_id', 
      targetKey: 'user_id',
      as: 'User'
    });
    SavedJob.belongsTo(models.Job, { 
      foreignKey: 'job_id', 
      targetKey: 'id',
      as: 'Job'
    });
  };

  return SavedJob;
}; 
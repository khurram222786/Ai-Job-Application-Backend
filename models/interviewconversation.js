module.exports = (sequelize, DataTypes) => {
    const InterviewConversation = sequelize.define('InterviewConversation', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      interview_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      conversation: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'interview_conversation',
      timestamps: false // or set true if you want Sequelize to manage createdAt/updatedAt
    });
  
    InterviewConversation.associate = function(models) {
      InterviewConversation.belongsTo(models.Interview, { foreignKey: 'interview_id' });
    };
  
    return InterviewConversation;
  };
  
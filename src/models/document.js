module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    file_url: DataTypes.STRING,
    file_name: DataTypes.STRING,
    user_id: DataTypes.INTEGER,
    parsed_data: DataTypes.JSON,
  }, {});

  Document.associate = function(models) {
    Document.belongsTo(models.User, { foreignKey: 'user_id' });
  };
  return Document;
};
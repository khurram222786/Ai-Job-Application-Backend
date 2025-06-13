module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Jobs', 'responsibilities', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('Jobs', 'location', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Jobs', 'salary', {
      type: Sequelize.STRING, // or Sequelize.INTEGER/FLOAT
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Jobs', 'responsibilities');
    await queryInterface.removeColumn('Jobs', 'location');
    await queryInterface.removeColumn('Jobs', 'salary');
  }
};

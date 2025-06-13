'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Jobs', 'working_hours', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Jobs', 'job_type', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Jobs', 'employment_type', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Jobs', 'working_hours');
    await queryInterface.removeColumn('Jobs', 'job_type');
    await queryInterface.removeColumn('Jobs', 'employment_type');
  }
};

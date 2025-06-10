'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Interviews', 'progress', {
      type: Sequelize.ENUM('scheduled', 'inprogress', 'completed'),
      defaultValue: 'scheduled'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Interviews', 'progress');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Interviews_progress";');
  }
};
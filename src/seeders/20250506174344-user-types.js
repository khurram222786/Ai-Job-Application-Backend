'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Insert only if they don't already exist
    const existingRoles = await queryInterface.sequelize.query(
      `SELECT role FROM "UserTypes" WHERE role IN ('admin', 'user');`
    );

    const roles = existingRoles[0].map(r => r.role);
    const newRoles = [];

    if (!roles.includes('admin')) newRoles.push({ role: 'admin', createdAt: new Date(), updatedAt: new Date() });
    if (!roles.includes('user')) newRoles.push({ role: 'user', createdAt: new Date(), updatedAt: new Date() });

    if (newRoles.length > 0) {
      await queryInterface.bulkInsert('UserTypes', newRoles, {});
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('UserTypes', {
      role: ['admin', 'user']
    }, {});
  }
};

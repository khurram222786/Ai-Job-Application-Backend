module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First add column allowing NULL
    await queryInterface.addColumn('Users', 'password', {
      type: Sequelize.STRING,
      allowNull: true // Temporary allow NULL
    });

    // Set default password for existing users
    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('defaultPassword', salt);
    
    await queryInterface.sequelize.query(
      `UPDATE "Users" SET password = :hashedPassword WHERE password IS NULL`,
      {
        replacements: { hashedPassword: defaultHashedPassword },
        type: Sequelize.QueryTypes.UPDATE
      }
    );

    // Now alter column to disallow NULL
    await queryInterface.changeColumn('Users', 'password', {
      type: Sequelize.STRING,
      allowNull: false
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('Users', 'password');
  }
};
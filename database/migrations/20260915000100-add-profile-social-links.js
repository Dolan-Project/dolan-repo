"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("user_profiles", "instagram_url", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("user_profiles", "tiktok_url", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("user_profiles", "tiktok_url");
    await queryInterface.removeColumn("user_profiles", "instagram_url");
  },
};

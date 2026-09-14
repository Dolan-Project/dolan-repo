"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("places", "cached_photo_name", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("places", "cached_photo_url", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("places", "cached_photo_attribution", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("places", "cached_photo_attribution");
    await queryInterface.removeColumn("places", "cached_photo_url");
    await queryInterface.removeColumn("places", "cached_photo_name");
  },
};

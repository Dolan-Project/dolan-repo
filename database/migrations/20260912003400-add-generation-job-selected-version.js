"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("generation_jobs", "selected_itinerary_version_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "itinerary_versions", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("generation_jobs", "selected_itinerary_version_id");
  },
};

"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("itinerary_days", {
      id: uuidPrimaryKey(Sequelize),
      itinerary_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "itinerary_versions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      day_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("itinerary_days", {
      fields: ["itinerary_version_id", "day_number"],
      type: "unique",
      name: "itinerary_days_version_day_uk",
    });
    await queryInterface.addConstraint("itinerary_days", {
      fields: ["day_number"],
      type: "check",
      name: "itinerary_days_day_number_check",
      where: Sequelize.where(Sequelize.col("day_number"), ">", 0),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("itinerary_days");
  },
};

"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("itinerary_versions", {
      id: uuidPrimaryKey(Sequelize),
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "trips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      version_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      source: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "MANUAL",
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      assumptions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("itinerary_versions", {
      fields: ["trip_id", "version_number"],
      type: "unique",
      name: "itinerary_versions_trip_version_uk",
    });
    await queryInterface.addConstraint("itinerary_versions", {
      fields: ["source"],
      type: "check",
      name: "itinerary_versions_source_check",
      where: { source: ["MANUAL", "AI", "TEMPLATE", "REGENERATED"] },
    });
    await queryInterface.addConstraint("itinerary_versions", {
      fields: ["version_number"],
      type: "check",
      name: "itinerary_versions_version_number_check",
      where: Sequelize.where(Sequelize.col("version_number"), ">", 0),
    });

    await queryInterface.addIndex("itinerary_versions", ["trip_id"], {
      name: "itinerary_versions_trip_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("itinerary_versions");
  },
};

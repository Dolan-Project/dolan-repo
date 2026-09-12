"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("location_latest", {
      id: uuidPrimaryKey(Sequelize),
      location_share_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "location_shares", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      latitude: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      longitude: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      accuracy_meters: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("location_latest", ["recorded_at"], {
      name: "location_latest_recorded_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("location_latest");
  },
};

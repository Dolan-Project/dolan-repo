"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("places", {
      id: uuidPrimaryKey(Sequelize),
      google_place_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      cached_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      cached_city: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      cached_latitude: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      cached_longitude: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      cache_checked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("places", {
      fields: ["status"],
      type: "check",
      name: "places_status_check",
      where: { status: ["ACTIVE", "INACTIVE"] },
    });

    await queryInterface.addIndex("places", ["cached_city"], {
      name: "places_cached_city_idx",
    });
    await queryInterface.addIndex("places", ["status", "cached_city"], {
      name: "places_status_city_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("places");
  },
};

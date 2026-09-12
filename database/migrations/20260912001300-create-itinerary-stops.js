"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("itinerary_stops", {
      id: uuidPrimaryKey(Sequelize),
      itinerary_day_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "itinerary_days", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      place_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "places", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      sequence: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      activity_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "VISIT",
      },
      custom_title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
      },
      travel_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_locked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("itinerary_stops", {
      fields: ["itinerary_day_id", "sequence"],
      type: "unique",
      name: "itinerary_stops_day_sequence_uk",
    });
    await queryInterface.addConstraint("itinerary_stops", {
      fields: ["sequence"],
      type: "check",
      name: "itinerary_stops_sequence_check",
      where: Sequelize.where(Sequelize.col("sequence"), ">", 0),
    });
    await queryInterface.addConstraint("itinerary_stops", {
      fields: ["duration_minutes"],
      type: "check",
      name: "itinerary_stops_duration_minutes_check",
      where: Sequelize.where(Sequelize.col("duration_minutes"), ">", 0),
    });
    await queryInterface.addConstraint("itinerary_stops", {
      fields: ["travel_duration_minutes"],
      type: "check",
      name: "itinerary_stops_travel_duration_check",
      where: Sequelize.literal(
        "travel_duration_minutes IS NULL OR travel_duration_minutes >= 0",
      ),
    });
    await queryInterface.addIndex("itinerary_stops", ["place_id"], {
      name: "itinerary_stops_place_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("itinerary_stops");
  },
};

"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("template_stops", {
      id: uuidPrimaryKey(Sequelize),
      template_day_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "template_days", key: "id" },
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
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("template_stops", {
      fields: ["template_day_id", "sequence"],
      type: "unique",
      name: "template_stops_day_sequence_uk",
    });
    await queryInterface.addConstraint("template_stops", {
      fields: ["sequence"],
      type: "check",
      name: "template_stops_sequence_check",
      where: Sequelize.where(Sequelize.col("sequence"), ">", 0),
    });
    await queryInterface.addConstraint("template_stops", {
      fields: ["duration_minutes"],
      type: "check",
      name: "template_stops_duration_minutes_check",
      where: Sequelize.where(Sequelize.col("duration_minutes"), ">", 0),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("template_stops");
  },
};

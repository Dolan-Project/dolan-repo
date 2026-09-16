"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("template_days", {
      id: uuidPrimaryKey(Sequelize),
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "itinerary_templates", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      day_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("template_days", {
      fields: ["template_id", "day_number"],
      type: "unique",
      name: "template_days_template_id_day_number_uk",
    });
    await queryInterface.addConstraint("template_days", {
      fields: ["day_number"],
      type: "check",
      name: "template_days_day_number_check",
      where: Sequelize.where(Sequelize.col("day_number"), ">", 0),
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("template_days");
  },
};

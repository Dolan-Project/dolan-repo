"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("budget_items", {
      id: uuidPrimaryKey(Sequelize),
      itinerary_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "itinerary_versions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      itinerary_stop_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "itinerary_stops", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      category: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      label: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 1,
      },
      unit: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "item",
      },
      unit_cost_low: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      unit_cost_high: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      source_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "ESTIMATE",
      },
      source_reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      checked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("budget_items", {
      fields: ["quantity"],
      type: "check",
      name: "budget_items_quantity_check",
      where: Sequelize.where(Sequelize.col("quantity"), ">=", 0),
    });
    await queryInterface.addConstraint("budget_items", {
      fields: ["unit_cost_low"],
      type: "check",
      name: "budget_items_unit_cost_low_check",
      where: Sequelize.where(Sequelize.col("unit_cost_low"), ">=", 0),
    });
    await queryInterface.addConstraint("budget_items", {
      fields: ["unit_cost_high"],
      type: "check",
      name: "budget_items_unit_cost_high_check",
      where: Sequelize.literal("unit_cost_high >= unit_cost_low"),
    });
    await queryInterface.addIndex("budget_items", ["itinerary_version_id"], {
      name: "budget_items_version_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("budget_items");
  },
};

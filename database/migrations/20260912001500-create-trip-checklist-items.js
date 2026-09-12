"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("trip_checklist_items", {
      id: uuidPrimaryKey(Sequelize),
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "trips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("trip_checklist_items", ["trip_id", "is_completed"], {
      name: "trip_checklist_items_trip_completed_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("trip_checklist_items");
  },
};

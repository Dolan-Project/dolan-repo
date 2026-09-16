"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("trip_checklist_checks", {
      id: uuidPrimaryKey(Sequelize),
      item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "trip_checklist_items", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("trip_checklist_checks", ["item_id", "user_id"], {
      unique: true,
      name: "trip_checklist_checks_item_user_uq",
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS trip_checklist_items_trip_title_uq
      ON trip_checklist_items (trip_id, lower(btrim(title)));
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query("DROP INDEX IF EXISTS trip_checklist_items_trip_title_uq;");
    await queryInterface.dropTable("trip_checklist_checks");
  },
};

"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("moderation_actions", {
      id: uuidPrimaryKey(Sequelize),
      report_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "reports", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      admin_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      action: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      acted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("moderation_actions", ["report_id", "acted_at"], {
      name: "moderation_actions_report_acted_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("moderation_actions");
  },
};

"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notifications", {
      id: uuidPrimaryKey(Sequelize),
      recipient_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      actor_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      type: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      target_type: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      target_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex(
      "notifications",
      ["recipient_user_id", "read_at", "created_at"],
      { name: "notifications_recipient_read_created_idx" },
    );
    await queryInterface.addIndex("notifications", ["type"], {
      name: "notifications_type_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
  },
};

"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("push_subscriptions", {
      id: uuidPrimaryKey(Sequelize),
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      endpoint: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true,
      },
      p256dh_encrypted: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      auth_encrypted: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("push_subscriptions", ["user_id", "revoked_at"], {
      name: "push_subscriptions_user_revoked_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("push_subscriptions");
  },
};

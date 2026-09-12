"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("idempotency_keys", {
      id: uuidPrimaryKey(Sequelize),
      actor_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      operation: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      key: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      request_hash: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      response_body: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("idempotency_keys", {
      fields: ["actor_user_id", "operation", "key"],
      type: "unique",
      name: "idempotency_keys_actor_operation_key_uk",
    });
    await queryInterface.addIndex("idempotency_keys", ["expires_at"], {
      name: "idempotency_keys_expires_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("idempotency_keys");
  },
};

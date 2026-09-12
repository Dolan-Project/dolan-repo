"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reports", {
      id: uuidPrimaryKey(Sequelize),
      reporter_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      target_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      target_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      reason: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "OPEN",
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("reports", {
      fields: ["status"],
      type: "check",
      name: "reports_status_check",
      where: { status: ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] },
    });
    await queryInterface.addIndex("reports", ["status", "created_at"], {
      name: "reports_status_created_at_idx",
    });
    await queryInterface.addIndex("reports", ["target_type", "target_id"], {
      name: "reports_target_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("reports");
  },
};

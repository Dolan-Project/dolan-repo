"use strict";

const { uuidPrimaryKey, timestamps, ensurePgcrypto } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await ensurePgcrypto(queryInterface);

    await queryInterface.createTable("users", {
      id: uuidPrimaryKey(Sequelize),
      auth_reference: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      email: {
        type: Sequelize.STRING(320),
        allowNull: false,
        unique: true,
      },
      role: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "USER",
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      email_verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("users", {
      fields: ["role"],
      type: "check",
      name: "users_role_check",
      where: { role: ["USER", "ADMIN"] },
    });

    await queryInterface.addConstraint("users", {
      fields: ["status"],
      type: "check",
      name: "users_status_check",
      where: { status: ["ACTIVE", "RESTRICTED", "SUSPENDED"] },
    });

    await queryInterface.addIndex("users", ["status"], { name: "users_status_idx" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("users");
  },
};

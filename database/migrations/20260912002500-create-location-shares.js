"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("location_shares", {
      id: uuidPrimaryKey(Sequelize),
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      trip_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "trips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      scope: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("location_shares", {
      fields: ["scope"],
      type: "check",
      name: "location_shares_scope_check",
      where: { scope: ["TRIP_PRECISE", "PUBLIC_APPROXIMATE"] },
    });
    await queryInterface.addIndex(
      "location_shares",
      ["user_id", "trip_id", "revoked_at", "expires_at"],
      { name: "location_shares_active_idx" },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("location_shares");
  },
};

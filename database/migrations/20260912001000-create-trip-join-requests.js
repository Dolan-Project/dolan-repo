"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("trip_join_requests", {
      id: uuidPrimaryKey(Sequelize),
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "trips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "PENDING",
      },
      reviewed_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("trip_join_requests", {
      fields: ["trip_id", "user_id"],
      type: "unique",
      name: "trip_join_requests_trip_user_uk",
    });
    await queryInterface.addConstraint("trip_join_requests", {
      fields: ["status"],
      type: "check",
      name: "trip_join_requests_status_check",
      where: { status: ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"] },
    });

    await queryInterface.addIndex("trip_join_requests", ["trip_id", "status"], {
      name: "trip_join_requests_trip_status_idx",
    });
    await queryInterface.addIndex("trip_join_requests", ["user_id", "status"], {
      name: "trip_join_requests_user_status_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("trip_join_requests");
  },
};

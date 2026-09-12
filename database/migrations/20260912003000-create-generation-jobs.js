"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("generation_jobs", {
      id: uuidPrimaryKey(Sequelize),
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "trips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      requested_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      type: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "QUEUED",
      },
      idempotency_key: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      result_version_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "itinerary_versions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      attempt_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      locked_by: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      locked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      finished_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      error_code: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("generation_jobs", {
      fields: ["status"],
      type: "check",
      name: "generation_jobs_status_check",
      where: { status: ["QUEUED", "PROCESSING", "SUCCEEDED", "FAILED"] },
    });
    await queryInterface.addConstraint("generation_jobs", {
      fields: ["requested_by_user_id", "idempotency_key"],
      type: "unique",
      name: "generation_jobs_requester_idempotency_uk",
    });
    await queryInterface.addConstraint("generation_jobs", {
      fields: ["attempt_count"],
      type: "check",
      name: "generation_jobs_attempt_count_check",
      where: Sequelize.where(Sequelize.col("attempt_count"), ">=", 0),
    });
    await queryInterface.addIndex("generation_jobs", ["status", "created_at"], {
      name: "generation_jobs_status_created_at_idx",
    });
    await queryInterface.addIndex("generation_jobs", ["trip_id", "status"], {
      name: "generation_jobs_trip_status_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("generation_jobs");
  },
};

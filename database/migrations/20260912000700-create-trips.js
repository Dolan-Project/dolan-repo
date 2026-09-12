"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("trips", {
      id: uuidPrimaryKey(Sequelize),
      host_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      visibility: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "PRIVATE",
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      timezone: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "Asia/Jakarta",
      },
      private_origin_label: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      private_origin_latitude: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      private_origin_longitude: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      destination_city: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      public_meeting_point_label: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      public_meeting_point_latitude: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      public_meeting_point_longitude: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      transport_mode: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      budget_amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      budget_basis: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "PER_PERSON",
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: "IDR",
      },
      planning_party_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      max_participants: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      current_itinerary_version_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      preferences: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("trips", {
      fields: ["visibility"],
      type: "check",
      name: "trips_visibility_check",
      where: { visibility: ["PRIVATE", "PUBLIC"] },
    });
    await queryInterface.addConstraint("trips", {
      fields: ["status"],
      type: "check",
      name: "trips_status_check",
      where: {
        status: ["DRAFT", "OPEN", "CLOSED", "ONGOING", "COMPLETED", "CANCELLED"],
      },
    });
    await queryInterface.addConstraint("trips", {
      fields: ["budget_basis"],
      type: "check",
      name: "trips_budget_basis_check",
      where: { budget_basis: ["PER_PERSON", "GROUP"] },
    });
    await queryInterface.addConstraint("trips", {
      fields: ["planning_party_size"],
      type: "check",
      name: "trips_planning_party_size_check",
      where: Sequelize.where(Sequelize.col("planning_party_size"), ">", 0),
    });
    await queryInterface.addConstraint("trips", {
      fields: ["max_participants"],
      type: "check",
      name: "trips_max_participants_check",
      where: Sequelize.literal(
        "max_participants IS NULL OR max_participants >= planning_party_size",
      ),
    });
    await queryInterface.addConstraint("trips", {
      fields: ["budget_amount"],
      type: "check",
      name: "trips_budget_amount_check",
      where: Sequelize.literal("budget_amount IS NULL OR budget_amount >= 0"),
    });
    await queryInterface.addConstraint("trips", {
      fields: ["start_date", "end_date"],
      type: "check",
      name: "trips_date_range_check",
      where: Sequelize.literal(
        "start_date IS NULL OR end_date IS NULL OR end_date >= start_date",
      ),
    });

    await queryInterface.addIndex("trips", ["host_user_id"], {
      name: "trips_host_user_id_idx",
    });
    await queryInterface.addIndex(
      "trips",
      ["visibility", "status", "destination_city", "start_date"],
      { name: "trips_public_search_idx" },
    );
    await queryInterface.addIndex("trips", ["status"], { name: "trips_status_idx" });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("trips");
  },
};

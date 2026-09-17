"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("trip_members", {
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
      role: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      membership_status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      host_attendance: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "UNCONFIRMED",
      },
      self_attendance: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "UNCONFIRMED",
      },
      show_on_profile: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      left_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("trip_members", {
      fields: ["trip_id", "user_id"],
      type: "unique",
      name: "trip_members_trip_user_uk",
    });
    await queryInterface.addConstraint("trip_members", {
      fields: ["role"],
      type: "check",
      name: "trip_members_role_check",
      where: { role: ["HOST", "PARTICIPANT"] },
    });
    await queryInterface.addConstraint("trip_members", {
      fields: ["membership_status"],
      type: "check",
      name: "trip_members_membership_status_check",
      where: { membership_status: ["ACTIVE", "LEFT", "REMOVED"] },
    });
    await queryInterface.addConstraint("trip_members", {
      fields: ["host_attendance"],
      type: "check",
      name: "trip_members_host_attendance_check",
      where: { host_attendance: ["UNCONFIRMED", "PRESENT", "ABSENT", "DISPUTED"] },
    });
    await queryInterface.addConstraint("trip_members", {
      fields: ["self_attendance"],
      type: "check",
      name: "trip_members_self_attendance_check",
      where: { self_attendance: ["UNCONFIRMED", "PRESENT", "ABSENT", "DISPUTED"] },
    });

    await queryInterface.addIndex(
      "trip_members",
      ["trip_id", "membership_status", "role"],
      { name: "trip_members_trip_status_role_idx" },
    );
    await queryInterface.addIndex("trip_members", ["user_id", "membership_status"], {
      name: "trip_members_user_status_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("trip_members");
  },
};

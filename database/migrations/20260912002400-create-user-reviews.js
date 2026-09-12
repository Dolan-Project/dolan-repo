"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_reviews", {
      id: uuidPrimaryKey(Sequelize),
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "trips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      reviewer_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      reviewee_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      communication_rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      attitude_rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      moderation_status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "VISIBLE",
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("user_reviews", {
      fields: ["trip_id", "reviewer_user_id", "reviewee_user_id"],
      type: "unique",
      name: "user_reviews_trip_reviewer_reviewee_uk",
    });
    await queryInterface.addConstraint("user_reviews", {
      fields: ["reviewer_user_id", "reviewee_user_id"],
      type: "check",
      name: "user_reviews_not_self_check",
      where: Sequelize.literal("reviewer_user_id <> reviewee_user_id"),
    });
    await queryInterface.addConstraint("user_reviews", {
      fields: ["communication_rating"],
      type: "check",
      name: "user_reviews_communication_rating_check",
      where: Sequelize.literal(
        "communication_rating >= 1 AND communication_rating <= 5",
      ),
    });
    await queryInterface.addConstraint("user_reviews", {
      fields: ["attitude_rating"],
      type: "check",
      name: "user_reviews_attitude_rating_check",
      where: Sequelize.literal("attitude_rating >= 1 AND attitude_rating <= 5"),
    });
    await queryInterface.addConstraint("user_reviews", {
      fields: ["moderation_status"],
      type: "check",
      name: "user_reviews_moderation_status_check",
      where: { moderation_status: ["VISIBLE", "HIDDEN", "UNDER_REVIEW"] },
    });
    await queryInterface.addIndex("user_reviews", ["reviewee_user_id", "moderation_status"], {
      name: "user_reviews_reviewee_status_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_reviews");
  },
};

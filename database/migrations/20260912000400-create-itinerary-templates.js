"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("itinerary_templates", {
      id: uuidPrimaryKey(Sequelize),
      creator_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      source_trip_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      duration_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      transport_mode: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      source: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "CURATED",
      },
      publication_status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "PUBLISHED",
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cover_place_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "places", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      usage_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("itinerary_templates", {
      fields: ["source"],
      type: "check",
      name: "itinerary_templates_source_check",
      where: { source: ["CURATED", "USER_TRIP"] },
    });
    await queryInterface.addConstraint("itinerary_templates", {
      fields: ["publication_status"],
      type: "check",
      name: "itinerary_templates_publication_status_check",
      where: { publication_status: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
    });
    await queryInterface.addConstraint("itinerary_templates", {
      fields: ["duration_days"],
      type: "check",
      name: "itinerary_templates_duration_days_check",
      where: Sequelize.where(Sequelize.col("duration_days"), ">", 0),
    });
    await queryInterface.addConstraint("itinerary_templates", {
      fields: ["usage_count"],
      type: "check",
      name: "itinerary_templates_usage_count_check",
      where: Sequelize.where(Sequelize.col("usage_count"), ">=", 0),
    });

    await queryInterface.addIndex("itinerary_templates", ["city"], {
      name: "itinerary_templates_city_idx",
    });
    await queryInterface.addIndex(
      "itinerary_templates",
      ["publication_status", "city", "usage_count"],
      { name: "itinerary_templates_search_idx" },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("itinerary_templates");
  },
};

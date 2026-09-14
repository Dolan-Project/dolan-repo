"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("provinces", {
      id: uuidPrimaryKey(Sequelize),
      slug: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      capital: { type: Sequelize.STRING(120), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      hero_query: { type: Sequelize.STRING(255), allowNull: false },
      featured_rank: { type: Sequelize.INTEGER, allowNull: false },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint("provinces", {
      fields: ["featured_rank"], type: "check", name: "provinces_featured_rank_check",
      where: Sequelize.where(Sequelize.col("featured_rank"), ">", 0),
    });
    await queryInterface.addIndex("provinces", ["featured_rank"], { name: "provinces_featured_rank_idx" });

    await queryInterface.createTable("province_places", {
      id: uuidPrimaryKey(Sequelize),
      province_id: { type: Sequelize.UUID, allowNull: false, references: { model: "provinces", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      name: { type: Sequelize.STRING(200), allowNull: false },
      city: { type: Sequelize.STRING(120), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      google_place_id: { type: Sequelize.STRING(255), allowNull: true },
      google_maps_url: { type: Sequelize.TEXT, allowNull: false },
      search_query: { type: Sequelize.STRING(255), allowNull: false },
      rank: { type: Sequelize.INTEGER, allowNull: false },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint("province_places", { fields: ["province_id", "rank"], type: "unique", name: "province_places_province_rank_uk" });
    await queryInterface.addConstraint("province_places", { fields: ["rank"], type: "check", name: "province_places_rank_check", where: Sequelize.where(Sequelize.col("rank"), ">", 0) });
    await queryInterface.addIndex("province_places", ["province_id", "rank"], { name: "province_places_browse_idx" });

    await queryInterface.addColumn("itinerary_templates", "province_id", { type: Sequelize.UUID, allowNull: true, references: { model: "provinces", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" });
    await queryInterface.addColumn("itinerary_templates", "featured_rank", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn("itinerary_templates", "budget_low", { type: Sequelize.DECIMAL(14, 2), allowNull: true });
    await queryInterface.addColumn("itinerary_templates", "budget_high", { type: Sequelize.DECIMAL(14, 2), allowNull: true });
    await queryInterface.addIndex("itinerary_templates", ["province_id", "publication_status", "featured_rank", "usage_count"], { name: "itinerary_templates_province_popular_idx" });

    await queryInterface.addColumn("trips", "gender_rule", { type: Sequelize.STRING(32), allowNull: false, defaultValue: "ALL_GENDERS" });
    await queryInterface.addColumn("trips", "community_rules", { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addConstraint("trips", { fields: ["gender_rule"], type: "check", name: "trips_gender_rule_check", where: { gender_rule: ["ALL_GENDERS", "FEMALE_ONLY", "MALE_ONLY"] } });

    await queryInterface.createTable("trip_invitations", {
      id: uuidPrimaryKey(Sequelize),
      trip_id: { type: Sequelize.UUID, allowNull: false, references: { model: "trips", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      invited_by_user_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
      invited_user_id: { type: Sequelize.UUID, allowNull: true, references: { model: "users", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
      token_hash: { type: Sequelize.STRING(128), allowNull: true, unique: true },
      channel: { type: Sequelize.STRING(20), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "PENDING" },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint("trip_invitations", { fields: ["channel"], type: "check", name: "trip_invitations_channel_check", where: { channel: ["DOLAN", "WHATSAPP"] } });
    await queryInterface.addConstraint("trip_invitations", { fields: ["status"], type: "check", name: "trip_invitations_status_check", where: { status: ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"] } });
    await queryInterface.addIndex("trip_invitations", ["trip_id", "status"], { name: "trip_invitations_trip_status_idx" });
    await queryInterface.addIndex("trip_invitations", ["invited_user_id", "status"], { name: "trip_invitations_user_status_idx" });

    await queryInterface.addColumn("itinerary_stops", "route_polyline", { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn("itinerary_stops", "travel_distance_meters", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn("itinerary_stops", "route_status", { type: Sequelize.STRING(24), allowNull: false, defaultValue: "PENDING" });
    await queryInterface.addColumn("itinerary_stops", "route_travel_mode", { type: Sequelize.STRING(24), allowNull: true });
    await queryInterface.addConstraint("itinerary_stops", { fields: ["route_status"], type: "check", name: "itinerary_stops_route_status_check", where: { route_status: ["PENDING", "AVAILABLE", "UNAVAILABLE"] } });

    await queryInterface.addColumn("generation_jobs", "request_payload", { type: Sequelize.JSONB, allowNull: false, defaultValue: {} });
    await queryInterface.addColumn("generation_jobs", "result_payload", { type: Sequelize.JSONB, allowNull: true });

    await queryInterface.addColumn("user_profiles", "avatar_file_id", { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addColumn("user_profiles", "cover_file_id", { type: Sequelize.STRING(255), allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("user_profiles", "cover_file_id");
    await queryInterface.removeColumn("user_profiles", "avatar_file_id");
    await queryInterface.removeColumn("generation_jobs", "result_payload");
    await queryInterface.removeColumn("generation_jobs", "request_payload");
    await queryInterface.removeConstraint("itinerary_stops", "itinerary_stops_route_status_check");
    await queryInterface.removeColumn("itinerary_stops", "route_travel_mode");
    await queryInterface.removeColumn("itinerary_stops", "route_status");
    await queryInterface.removeColumn("itinerary_stops", "travel_distance_meters");
    await queryInterface.removeColumn("itinerary_stops", "route_polyline");
    await queryInterface.dropTable("trip_invitations");
    await queryInterface.removeConstraint("trips", "trips_gender_rule_check");
    await queryInterface.removeColumn("trips", "community_rules");
    await queryInterface.removeColumn("trips", "gender_rule");
    await queryInterface.removeIndex("itinerary_templates", "itinerary_templates_province_popular_idx");
    await queryInterface.removeColumn("itinerary_templates", "budget_high");
    await queryInterface.removeColumn("itinerary_templates", "budget_low");
    await queryInterface.removeColumn("itinerary_templates", "featured_rank");
    await queryInterface.removeColumn("itinerary_templates", "province_id");
    await queryInterface.dropTable("province_places");
    await queryInterface.dropTable("provinces");
  },
};

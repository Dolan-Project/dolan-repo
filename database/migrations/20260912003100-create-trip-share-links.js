"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("trip_share_links", {
      id: uuidPrimaryKey(Sequelize),
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "trips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      token_hash: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      permitted_fields: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("trip_share_links", ["trip_id", "revoked_at"], {
      name: "trip_share_links_trip_revoked_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("trip_share_links");
  },
};

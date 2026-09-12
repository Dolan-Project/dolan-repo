"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_profiles", {
      id: uuidPrimaryKey(Sequelize),
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      username: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      display_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      avatar_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cover_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cover_caption: {
        type: Sequelize.STRING(280),
        allowNull: true,
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      domicile: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("user_profiles", ["username"], {
      name: "user_profiles_username_idx",
    });
    await queryInterface.addIndex("user_profiles", ["display_name"], {
      name: "user_profiles_display_name_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_profiles");
  },
};

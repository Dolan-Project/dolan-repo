"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_follows", {
      id: uuidPrimaryKey(Sequelize),
      follower_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      following_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("user_follows", {
      fields: ["follower_user_id", "following_user_id"],
      type: "unique",
      name: "user_follows_follower_following_uk",
    });
    await queryInterface.addConstraint("user_follows", {
      fields: ["follower_user_id", "following_user_id"],
      type: "check",
      name: "user_follows_not_self_check",
      where: Sequelize.literal("follower_user_id <> following_user_id"),
    });
    await queryInterface.addIndex("user_follows", ["following_user_id"], {
      name: "user_follows_following_user_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_follows");
  },
};

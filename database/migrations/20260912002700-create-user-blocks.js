"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_blocks", {
      id: uuidPrimaryKey(Sequelize),
      blocker_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      blocked_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("user_blocks", {
      fields: ["blocker_user_id", "blocked_user_id"],
      type: "unique",
      name: "user_blocks_blocker_blocked_uk",
    });
    await queryInterface.addConstraint("user_blocks", {
      fields: ["blocker_user_id", "blocked_user_id"],
      type: "check",
      name: "user_blocks_not_self_check",
      where: Sequelize.literal("blocker_user_id <> blocked_user_id"),
    });
    await queryInterface.addIndex("user_blocks", ["blocked_user_id"], {
      name: "user_blocks_blocked_user_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_blocks");
  },
};

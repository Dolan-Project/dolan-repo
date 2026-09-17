"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("message_read_states", {
      id: uuidPrimaryKey(Sequelize),
      chat_room_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "chat_rooms", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      last_read_message_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "messages", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("message_read_states", {
      fields: ["chat_room_id", "user_id"],
      type: "unique",
      name: "message_read_states_room_user_uk",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("message_read_states");
  },
};

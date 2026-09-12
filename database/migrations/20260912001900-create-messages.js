"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("messages", {
      id: uuidPrimaryKey(Sequelize),
      chat_room_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "chat_rooms", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      sender_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      client_message_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("messages", {
      fields: ["sender_user_id", "client_message_id"],
      type: "unique",
      name: "messages_sender_client_message_id_uk",
    });
    await queryInterface.addIndex("messages", ["chat_room_id", "sent_at"], {
      name: "messages_room_sent_at_idx",
    });
    await queryInterface.addIndex("messages", ["chat_room_id", "id"], {
      name: "messages_room_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("messages");
  },
};

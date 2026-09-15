"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("posts", {
      id: uuidPrimaryKey(Sequelize),
      author_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      caption: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: "",
      },
      image_url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      image_file_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      trip_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "trips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "itinerary_templates", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("posts", ["created_at"], {
      name: "posts_created_at_idx",
    });
    await queryInterface.addIndex("posts", ["author_user_id", "created_at"], {
      name: "posts_author_created_at_idx",
    });

    await queryInterface.createTable("post_likes", {
      id: uuidPrimaryKey(Sequelize),
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "posts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("post_likes", ["post_id", "user_id"], {
      unique: true,
      name: "post_likes_post_user_uidx",
    });

    await queryInterface.createTable("post_comments", {
      id: uuidPrimaryKey(Sequelize),
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "posts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("post_comments", ["post_id", "created_at"], {
      name: "post_comments_post_created_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("post_comments");
    await queryInterface.dropTable("post_likes");
    await queryInterface.dropTable("posts");
  },
};

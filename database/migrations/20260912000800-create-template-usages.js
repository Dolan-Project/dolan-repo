"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("template_usages", {
      id: uuidPrimaryKey(Sequelize),
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "itinerary_templates", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      created_trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "trips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.addConstraint("template_usages", {
      fields: ["template_id", "created_trip_id"],
      type: "unique",
      name: "template_usages_template_created_trip_uk",
    });
    await queryInterface.addIndex("template_usages", ["template_id", "used_at"], {
      name: "template_usages_template_used_at_idx",
    });
    await queryInterface.addIndex("template_usages", ["user_id"], {
      name: "template_usages_user_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("template_usages");
  },
};

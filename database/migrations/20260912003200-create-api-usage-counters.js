"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("api_usage_counters", {
      id: uuidPrimaryKey(Sequelize),
      provider: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      operation: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      period: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      request_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      estimated_cost: {
        type: Sequelize.DECIMAL(14, 6),
        allowNull: false,
        defaultValue: 0,
      },
      ...timestamps(Sequelize),
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX api_usage_counters_provider_operation_period_user_uk
      ON api_usage_counters (
        provider,
        operation,
        period,
        COALESCE(user_id, '00000000-0000-0000-0000-000000000000')
      );
    `);
    await queryInterface.addConstraint("api_usage_counters", {
      fields: ["request_count"],
      type: "check",
      name: "api_usage_counters_request_count_check",
      where: Sequelize.where(Sequelize.col("request_count"), ">=", 0),
    });
    await queryInterface.addConstraint("api_usage_counters", {
      fields: ["estimated_cost"],
      type: "check",
      name: "api_usage_counters_estimated_cost_check",
      where: Sequelize.where(Sequelize.col("estimated_cost"), ">=", 0),
    });
    await queryInterface.addIndex("api_usage_counters", ["period", "provider"], {
      name: "api_usage_counters_period_provider_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS api_usage_counters_provider_operation_period_user_uk;",
    );
    await queryInterface.dropTable("api_usage_counters");
  },
};

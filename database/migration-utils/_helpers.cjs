"use strict";

/** Shared migration helpers for Dolan schema */

function uuidPrimaryKey(Sequelize) {
  return {
    type: Sequelize.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: Sequelize.literal("gen_random_uuid()"),
  };
}

function timestamps(Sequelize) {
  return {
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  };
}

async function ensurePgcrypto(queryInterface) {
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
}

module.exports = {
  uuidPrimaryKey,
  timestamps,
  ensurePgcrypto,
};

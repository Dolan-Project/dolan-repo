"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("trips", ["updated_at"], {
      name: "trips_updated_at_idx",
    });
    await queryInterface.addIndex("generation_jobs", ["requested_by_user_id", "created_at"], {
      name: "generation_jobs_requested_by_created_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("generation_jobs", "generation_jobs_requested_by_created_idx");
    await queryInterface.removeIndex("trips", "trips_updated_at_idx");
  },
};

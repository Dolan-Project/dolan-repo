"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint("trips", {
      fields: ["current_itinerary_version_id"],
      type: "foreign key",
      name: "trips_current_itinerary_version_id_fkey",
      references: {
        table: "itinerary_versions",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    await queryInterface.addConstraint("itinerary_templates", {
      fields: ["source_trip_id"],
      type: "foreign key",
      name: "itinerary_templates_source_trip_id_fkey",
      references: {
        table: "trips",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Ensure current version belongs to the same trip (deferred until application writes).
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION enforce_trip_current_version_same_trip()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.current_itinerary_version_id IS NULL THEN
          RETURN NEW;
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM itinerary_versions iv
          WHERE iv.id = NEW.current_itinerary_version_id
            AND iv.trip_id = NEW.id
        ) THEN
          RAISE EXCEPTION 'current_itinerary_version_id must belong to the same trip';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trips_current_version_same_trip ON trips;
      CREATE TRIGGER trips_current_version_same_trip
      BEFORE INSERT OR UPDATE OF current_itinerary_version_id
      ON trips
      FOR EACH ROW
      EXECUTE FUNCTION enforce_trip_current_version_same_trip();
    `);

    // Silence unused Sequelize param warning in some CLI versions.
    void Sequelize;
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DROP TRIGGER IF EXISTS trips_current_version_same_trip ON trips;",
    );
    await queryInterface.sequelize.query(
      "DROP FUNCTION IF EXISTS enforce_trip_current_version_same_trip();",
    );
    await queryInterface.removeConstraint(
      "itinerary_templates",
      "itinerary_templates_source_trip_id_fkey",
    );
    await queryInterface.removeConstraint(
      "trips",
      "trips_current_itinerary_version_id_fkey",
    );
  },
};

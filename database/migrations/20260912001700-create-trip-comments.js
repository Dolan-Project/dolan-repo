"use strict";

const { uuidPrimaryKey, timestamps } = require("../migration-utils/_helpers.cjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("trip_comments", {
      id: uuidPrimaryKey(Sequelize),
      trip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "trips", key: "id" },
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
      parent_comment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "trip_comments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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

    await queryInterface.addIndex("trip_comments", ["trip_id", "created_at"], {
      name: "trip_comments_trip_created_at_idx",
    });
    await queryInterface.addIndex("trip_comments", ["parent_comment_id"], {
      name: "trip_comments_parent_comment_id_idx",
    });

    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION enforce_trip_comment_reply_rules()
      RETURNS trigger AS $$
      DECLARE
        parent_trip_id uuid;
        parent_parent_id uuid;
      BEGIN
        IF NEW.parent_comment_id IS NULL THEN
          RETURN NEW;
        END IF;
        SELECT trip_id, parent_comment_id
          INTO parent_trip_id, parent_parent_id
        FROM trip_comments
        WHERE id = NEW.parent_comment_id;
        IF parent_trip_id IS NULL THEN
          RAISE EXCEPTION 'parent comment not found';
        END IF;
        IF parent_trip_id <> NEW.trip_id THEN
          RAISE EXCEPTION 'parent comment must belong to the same trip';
        END IF;
        IF parent_parent_id IS NOT NULL THEN
          RAISE EXCEPTION 'only one reply level is allowed';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trip_comments_reply_rules ON trip_comments;
      CREATE TRIGGER trip_comments_reply_rules
      BEFORE INSERT OR UPDATE OF parent_comment_id, trip_id
      ON trip_comments
      FOR EACH ROW
      EXECUTE FUNCTION enforce_trip_comment_reply_rules();
    `);

    void Sequelize;
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DROP TRIGGER IF EXISTS trip_comments_reply_rules ON trip_comments;",
    );
    await queryInterface.sequelize.query(
      "DROP FUNCTION IF EXISTS enforce_trip_comment_reply_rules();",
    );
    await queryInterface.dropTable("trip_comments");
  },
};

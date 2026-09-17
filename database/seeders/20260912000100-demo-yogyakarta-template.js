"use strict";

/**
 * Demo seed for WIRA-D1.
 * - Uses verified-style Google Place IDs for Yogyakarta demo destinations.
 * - Template source = CURATED (label "Kurasi Dolan"); usage_count stays 0.
 * - Does not invent popularity.
 * - Local auth password for curator@dolan.local: password123
 */

const crypto = require("node:crypto");

const DEMO_USER_ID = "11111111-1111-4111-8111-111111111111";
const DEMO_PROFILE_ID = "22222222-2222-4222-8222-222222222222";
const PLACE_MALIOBORO_ID = "33333333-3333-4333-8333-333333333301";
const PLACE_PRAMBANAN_ID = "33333333-3333-4333-8333-333333333302";
const PLACE_PARANGTRITIS_ID = "33333333-3333-4333-8333-333333333303";
const TEMPLATE_ID = "44444444-4444-4444-8444-444444444401";
const TEMPLATE_DAY1_ID = "55555555-5555-4555-8555-555555555501";
const TEMPLATE_DAY2_ID = "55555555-5555-4555-8555-555555555502";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert("users", [
      {
        id: DEMO_USER_ID,
        auth_reference: "seed-dolan-curator",
        email: "curator@dolan.local",
        password_hash: hashPassword("password123"),
        role: "ADMIN",
        status: "ACTIVE",
        email_verified_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert("user_profiles", [
      {
        id: DEMO_PROFILE_ID,
        user_id: DEMO_USER_ID,
        username: "dolan_curator",
        display_name: "Kurator Dolan",
        avatar_url: null,
        cover_url: null,
        cover_caption: null,
        bio: "Akun development untuk seed template kurasi.",
        domicile: "Yogyakarta",
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert("places", [
      {
        id: PLACE_MALIOBORO_ID,
        google_place_id: "ChIJxYBx6Da5eY4R2lX2sQ0oYkA",
        cached_name: "Malioboro",
        cached_city: "Yogyakarta",
        cached_latitude: -7.7928,
        cached_longitude: 110.3658,
        cache_checked_at: now,
        status: "ACTIVE",
        created_at: now,
        updated_at: now,
      },
      {
        id: PLACE_PRAMBANAN_ID,
        google_place_id: "ChIJf5UqGYeXeY4RwZVQ9n0s7oE",
        cached_name: "Candi Prambanan",
        cached_city: "Yogyakarta",
        cached_latitude: -7.752,
        cached_longitude: 110.4915,
        cache_checked_at: now,
        status: "ACTIVE",
        created_at: now,
        updated_at: now,
      },
      {
        id: PLACE_PARANGTRITIS_ID,
        google_place_id: "ChIJV9m3p2KXeY4R8b0xq1m7x9Q",
        cached_name: "Pantai Parangtritis",
        cached_city: "Yogyakarta",
        cached_latitude: -8.025,
        cached_longitude: 110.3294,
        cache_checked_at: now,
        status: "ACTIVE",
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert("itinerary_templates", [
      {
        id: TEMPLATE_ID,
        creator_user_id: DEMO_USER_ID,
        source_trip_id: null,
        title: "Yogyakarta 2 Hari Ringkas",
        description:
          "Template kurasi Dolan untuk menjelajah pusat kota dan landmark utama Yogyakarta.",
        city: "Yogyakarta",
        duration_days: 2,
        transport_mode: "MIXED",
        source: "CURATED",
        publication_status: "PUBLISHED",
        published_at: now,
        cover_place_id: PLACE_MALIOBORO_ID,
        usage_count: 0,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert("template_days", [
      {
        id: TEMPLATE_DAY1_ID,
        template_id: TEMPLATE_ID,
        day_number: 1,
        title: "Kota dan Candi",
        created_at: now,
        updated_at: now,
      },
      {
        id: TEMPLATE_DAY2_ID,
        template_id: TEMPLATE_ID,
        day_number: 2,
        title: "Pantai Selatan",
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert("template_stops", [
      {
        id: "66666666-6666-4666-8666-666666666601",
        template_day_id: TEMPLATE_DAY1_ID,
        place_id: PLACE_MALIOBORO_ID,
        sequence: 1,
        activity_type: "VISIT",
        custom_title: null,
        duration_minutes: 120,
        notes: "Jalan kaki di koridor Malioboro.",
        created_at: now,
        updated_at: now,
      },
      {
        id: "66666666-6666-4666-8666-666666666602",
        template_day_id: TEMPLATE_DAY1_ID,
        place_id: PLACE_PRAMBANAN_ID,
        sequence: 2,
        activity_type: "VISIT",
        custom_title: null,
        duration_minutes: 150,
        notes: "Kunjungi kompleks Prambanan.",
        created_at: now,
        updated_at: now,
      },
      {
        id: "66666666-6666-4666-8666-666666666603",
        template_day_id: TEMPLATE_DAY2_ID,
        place_id: PLACE_PARANGTRITIS_ID,
        sequence: 1,
        activity_type: "VISIT",
        custom_title: null,
        duration_minutes: 180,
        notes: "Sunset di Parangtritis.",
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("template_stops", {
      id: [
        "66666666-6666-4666-8666-666666666601",
        "66666666-6666-4666-8666-666666666602",
        "66666666-6666-4666-8666-666666666603",
      ],
    });
    await queryInterface.bulkDelete("template_days", {
      id: [TEMPLATE_DAY1_ID, TEMPLATE_DAY2_ID],
    });
    await queryInterface.bulkDelete("itinerary_templates", { id: TEMPLATE_ID });
    await queryInterface.bulkDelete("places", {
      id: [PLACE_MALIOBORO_ID, PLACE_PRAMBANAN_ID, PLACE_PARANGTRITIS_ID],
    });
    await queryInterface.bulkDelete("user_profiles", { id: DEMO_PROFILE_ID });
    await queryInterface.bulkDelete("users", { id: DEMO_USER_ID });
  },
};

"use strict";

const crypto = require("node:crypto");
const catalog = require("../data/indonesia-provinces.json");

function uuid(value) {
  const hex = crypto.createHash("sha256").update(`dolan:${value}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert("provinces", catalog.map((province) => ({
      id: uuid(`province:${province.slug}`), slug: province.slug, name: province.name,
      capital: province.capital, description: province.description, hero_query: province.heroQuery,
      featured_rank: province.featuredRank, created_at: now, updated_at: now,
    })));

    await queryInterface.bulkInsert("province_places", catalog.flatMap((province) => province.places.map((place) => ({
      id: uuid(`province-place:${province.slug}:${place.rank}`), province_id: uuid(`province:${province.slug}`),
      name: place.name, city: place.city, description: place.description, google_place_id: null,
      google_maps_url: place.googleMapsUrl, search_query: `${place.name}, ${province.name}, Indonesia`,
      rank: place.rank, created_at: now, updated_at: now,
    }))));

    await queryInterface.bulkInsert("itinerary_templates", catalog.map((province) => ({
      id: uuid(`province-template:${province.slug}`), creator_user_id: null, source_trip_id: null,
      title: province.template.title, description: province.template.description, city: province.capital,
      province_id: uuid(`province:${province.slug}`), duration_days: province.template.durationDays,
      transport_mode: province.template.transportMode, source: "CURATED", publication_status: "PUBLISHED",
      published_at: now, cover_place_id: null, usage_count: 0, featured_rank: province.featuredRank,
      budget_low: province.template.budgetLow, budget_high: province.template.budgetHigh,
      created_at: now, updated_at: now,
    })));

    await queryInterface.bulkInsert("template_days", catalog.flatMap((province) =>
      Array.from({ length: province.template.durationDays }, (_, index) => ({
        id: uuid(`template-day:${province.slug}:${index + 1}`), template_id: uuid(`province-template:${province.slug}`),
        day_number: index + 1, title: `Hari ${index + 1} di ${province.name}`, created_at: now, updated_at: now,
      })),
    ));

    await queryInterface.bulkInsert("template_stops", catalog.flatMap((province) => province.template.stops.map((stop) => ({
      id: uuid(`template-stop:${province.slug}:${stop.day}:${stop.sequence}`),
      template_day_id: uuid(`template-day:${province.slug}:${stop.day}`), place_id: null,
      sequence: stop.sequence, activity_type: "VISIT", custom_title: stop.name,
      duration_minutes: stop.durationMinutes, notes: stop.notes, created_at: now, updated_at: now,
    }))));
  },

  async down(queryInterface) {
    const templateIds = catalog.map((province) => uuid(`province-template:${province.slug}`));
    const provinceIds = catalog.map((province) => uuid(`province:${province.slug}`));
    await queryInterface.bulkDelete("template_stops", { template_day_id: catalog.flatMap((province) => Array.from({ length: province.template.durationDays }, (_, index) => uuid(`template-day:${province.slug}:${index + 1}`))) });
    await queryInterface.bulkDelete("template_days", { template_id: templateIds });
    await queryInterface.bulkDelete("itinerary_templates", { id: templateIds });
    await queryInterface.bulkDelete("province_places", { province_id: provinceIds });
    await queryInterface.bulkDelete("provinces", { id: provinceIds });
  },
};

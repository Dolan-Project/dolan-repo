"use strict";

/**
 * Large demo social seed: travelers, public trips, members, joins, comments,
 * chat, notifications, follows, reviews, and template usage bumps.
 * Password for all *@dolan.demo users: password123
 * Undo by email domain / UUID namespace a1a1… / c2c2…
 */

const crypto = require("node:crypto");
const { destinations, deterministicUuid } = require("../data/demo-destinations.cjs");

const DEMO_PASSWORD = "password123";
const EMAIL_DOMAIN = "dolan.demo";

const FIRST_NAMES = [
  "Alya", "Budi", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hana",
  "Indra", "Joko", "Kirana", "Laras", "Maya", "Nanda", "Omar", "Putri",
  "Raka", "Salsa", "Tania", "Umar", "Vina", "Wira", "Yuni", "Zaki",
];

const TRIP_TITLES = [
  "Sunrise bareng di",
  "Weekend singkat ke",
  "Eksplor kuliner",
  "Trip hemat ke",
  "Fotografi di",
  "Healing ke",
  "Backpacking",
  "Open trip",
];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function demoUuid(kind, index) {
  const hex = crypto
    .createHash("sha256")
    .update(`dolan-live:${kind}:${index}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function addDays(base, days) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = hashPassword(DEMO_PASSWORD);
    const sequelize = queryInterface.sequelize;

    const users = FIRST_NAMES.map((name, index) => {
      const n = index + 1;
      const id = demoUuid("user", n);
      const email = `traveler${String(n).padStart(2, "0")}@${EMAIL_DOMAIN}`;
      return {
        id,
        auth_reference: `local-demo:${email}`,
        email,
        password_hash: passwordHash,
        role: "USER",
        status: "ACTIVE",
        email_verified_at: now,
        created_at: now,
        updated_at: now,
        profile: {
          id: demoUuid("profile", n),
          user_id: id,
          username: `demo_${name.toLowerCase()}${n}`,
          display_name: `${name} Demo`,
          avatar_url: null,
          cover_url: null,
          cover_caption: null,
          bio: `Traveler demo Dolan — suka jalan-jalan ke ${destinations[index % destinations.length].city}.`,
          domicile: destinations[index % destinations.length].city,
          created_at: now,
          updated_at: now,
        },
      };
    });

    await queryInterface.bulkInsert(
      "users",
      users.map(({ profile: _p, ...user }) => user),
    );
    await queryInterface.bulkInsert(
      "user_profiles",
      users.map((u) => u.profile),
    );

    const [placeRows] = await sequelize.query(
      `SELECT id, google_place_id, cached_name, cached_city, cached_latitude, cached_longitude, cached_photo_url
       FROM places
       WHERE cached_photo_url IS NOT NULL
       ORDER BY created_at ASC
       LIMIT 40`,
    );
    const places =
      placeRows.length > 0
        ? placeRows
        : destinations.map((dest) => ({
            id: deterministicUuid(dest.slug),
            google_place_id: dest.googlePlaceId || `seed_${dest.slug}`,
            cached_name: dest.name,
            cached_city: dest.city,
            cached_latitude: dest.latitude,
            cached_longitude: dest.longitude,
            cached_photo_url: dest.fallbackPhotoUrl,
          }));

    const tripCount = 30;
    const trips = [];
    const members = [];
    const joins = [];
    const versions = [];
    const days = [];
    const stops = [];
    const comments = [];
    const rooms = [];
    const messages = [];
    const notifications = [];
    const follows = [];
    const reviews = [];
    const tripUpdates = [];

    for (let i = 0; i < tripCount; i += 1) {
      const host = users[i % users.length];
      const place = places[i % places.length];
      const tripId = demoUuid("trip", i + 1);
      const versionId = demoUuid("version", i + 1);
      const dayId = demoUuid("day", i + 1);
      const stopId = demoUuid("stop", i + 1);
      const roomId = demoUuid("room", i + 1);
      const titlePrefix = TRIP_TITLES[i % TRIP_TITLES.length];
      const start = addDays(now, 7 + i * 2);
      const end = addDays(now, 9 + i * 2);
      const status = i % 7 === 0 ? "ONGOING" : i % 5 === 0 ? "CLOSED" : "OPEN";

      trips.push({
        id: tripId,
        host_user_id: host.id,
        title: `${titlePrefix} ${place.cached_name}`,
        description: `Open trip demo ke ${place.cached_city}. Bertemu di titik kumpul publik, budget fleksibel.`,
        visibility: "PUBLIC",
        status,
        start_date: start,
        end_date: end,
        timezone: "Asia/Jakarta",
        private_origin_label: null,
        private_origin_latitude: null,
        private_origin_longitude: null,
        destination_city: place.cached_city,
        public_meeting_point_label: place.cached_name,
        public_meeting_point_latitude: place.cached_latitude,
        public_meeting_point_longitude: place.cached_longitude,
        transport_mode: i % 2 === 0 ? "MIXED" : "TRANSIT",
        budget_amount: 750000 + i * 25000,
        budget_basis: "PER_PERSON",
        currency: "IDR",
        planning_party_size: 2,
        max_participants: 8,
        current_itinerary_version_id: null,
        preferences: JSON.stringify({ pace: "balanced", interests: ["wisata", "kuliner"] }),
        created_at: now,
        updated_at: now,
      });

      members.push({
        id: demoUuid("member-host", i + 1),
        trip_id: tripId,
        user_id: host.id,
        role: "HOST",
        membership_status: "ACTIVE",
        host_attendance: "UNCONFIRMED",
        self_attendance: "UNCONFIRMED",
        show_on_profile: true,
        joined_at: now,
        left_at: null,
        created_at: now,
        updated_at: now,
      });

      const participantA = users[(i + 3) % users.length];
      const participantB = users[(i + 7) % users.length];
      for (const [slot, participant] of [
        [1, participantA],
        [2, participantB],
      ]) {
        if (participant.id === host.id) continue;
        if (members.some((m) => m.trip_id === tripId && m.user_id === participant.id)) continue;
        members.push({
          id: demoUuid(`member-p${slot}`, i + 1),
          trip_id: tripId,
          user_id: participant.id,
          role: "PARTICIPANT",
          membership_status: "ACTIVE",
          host_attendance: "UNCONFIRMED",
          self_attendance: "UNCONFIRMED",
          show_on_profile: true,
          joined_at: now,
          left_at: null,
          created_at: now,
          updated_at: now,
        });
      }

      const joiner = users[(i + 11) % users.length];
      const memberIds = new Set(
        members.filter((m) => m.trip_id === tripId).map((m) => m.user_id),
      );
      if (joiner.id !== host.id && !memberIds.has(joiner.id)) {
        joins.push({
          id: demoUuid("join", i + 1),
          trip_id: tripId,
          user_id: joiner.id,
          message: "Mau ikut! Boleh join ya?",
          status: "PENDING",
          reviewed_by_user_id: null,
          reviewed_at: null,
          created_at: now,
          updated_at: now,
        });
        notifications.push({
          id: demoUuid("notif", i + 1),
          recipient_user_id: host.id,
          actor_user_id: joiner.id,
          type: "JOIN_REQUEST",
          target_type: "TRIP",
          target_id: tripId,
          data: JSON.stringify({ tripTitle: `${titlePrefix} ${place.cached_name}` }),
          read_at: i % 2 === 0 ? null : now,
          created_at: now,
          updated_at: now,
        });
      }

      versions.push({
        id: versionId,
        trip_id: tripId,
        version_number: 1,
        created_by_user_id: host.id,
        source: "MANUAL",
        summary: `Rencana singkat di ${place.cached_city}`,
        assumptions: JSON.stringify([]),
        created_at: now,
        updated_at: now,
      });
      days.push({
        id: dayId,
        itinerary_version_id: versionId,
        day_number: 1,
        date: start,
        title: `Hari 1 · ${place.cached_name}`,
        created_at: now,
        updated_at: now,
      });
      stops.push({
        id: stopId,
        itinerary_day_id: dayId,
        place_id: place.id,
        sequence: 1,
        activity_type: "VISIT",
        custom_title: null,
        start_time: "09:00:00",
        duration_minutes: 120,
        travel_duration_minutes: null,
        notes: `Kunjungi ${place.cached_name}`,
        is_locked: false,
        route_status: "PENDING",
        created_at: now,
        updated_at: now,
      });
      tripUpdates.push({ tripId, versionId });

      const commentAuthor =
        participantA.id === host.id ? participantB : participantA;
      comments.push({
        id: demoUuid("comment", i + 1),
        trip_id: tripId,
        user_id: commentAuthor.id,
        parent_comment_id: null,
        body: `Looks fun! Ada slot untuk ${place.cached_city}?`,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      });

      rooms.push({
        id: roomId,
        trip_id: tripId,
        read_only_at: null,
        created_at: now,
        updated_at: now,
      });
      messages.push({
        id: demoUuid("msg", i + 1),
        chat_room_id: roomId,
        sender_user_id: host.id,
        client_message_id: `demo-msg-${i + 1}`,
        body: `Halo semua — titik kumpul di ${place.cached_name}.`,
        sent_at: now,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      });

      if (status === "COMPLETED" || i % 8 === 0) {
        const reviewee = participantA.id === host.id ? participantB : participantA;
        if (reviewee && reviewee.id !== host.id) {
          reviews.push({
            id: demoUuid("review", i + 1),
            trip_id: tripId,
            reviewer_user_id: host.id,
            reviewee_user_id: reviewee.id,
            communication_rating: 4 + (i % 2),
            attitude_rating: 5,
            comment: "Asik diajak trip bareng!",
            moderation_status: "VISIBLE",
            created_at: now,
            updated_at: now,
          });
        }
      }
    }

    // Follow graph: each user follows next 3
    let followIndex = 0;
    for (let i = 0; i < users.length; i += 1) {
      for (let j = 1; j <= 3; j += 1) {
        const following = users[(i + j) % users.length];
        if (following.id === users[i].id) continue;
        followIndex += 1;
        follows.push({
          id: demoUuid("follow", followIndex),
          follower_user_id: users[i].id,
          following_user_id: following.id,
          created_at: now,
          updated_at: now,
        });
      }
    }

    await queryInterface.bulkInsert("trips", trips);
    await queryInterface.bulkInsert("trip_members", members);
    if (joins.length) await queryInterface.bulkInsert("trip_join_requests", joins);
    await queryInterface.bulkInsert("itinerary_versions", versions);
    await queryInterface.bulkInsert("itinerary_days", days);
    await queryInterface.bulkInsert("itinerary_stops", stops);

    for (const { tripId, versionId } of tripUpdates) {
      await sequelize.query(
        `UPDATE trips SET current_itinerary_version_id = :versionId, updated_at = :now WHERE id = :tripId`,
        { replacements: { tripId, versionId, now } },
      );
    }

    await queryInterface.bulkInsert("trip_comments", comments);
    await queryInterface.bulkInsert("chat_rooms", rooms);
    await queryInterface.bulkInsert("messages", messages);
    await queryInterface.bulkInsert("notifications", notifications);
    await queryInterface.bulkInsert("user_follows", follows);
    if (reviews.length) await queryInterface.bulkInsert("user_reviews", reviews);

    // Bump usage_count on popular curated templates + set cover_place when possible
    const coverPlaceId = places[0]?.id ?? null;
    await sequelize.query(
      `UPDATE itinerary_templates
       SET usage_count = GREATEST(usage_count, 12 + (ABS(HASHTEXT(id::text)) % 40)),
           cover_place_id = COALESCE(cover_place_id, :coverPlaceId),
           updated_at = :now
       WHERE publication_status = 'PUBLISHED'
         AND source = 'CURATED'
         AND featured_rank IS NOT NULL
         AND featured_rank <= 12`,
      { replacements: { coverPlaceId, now } },
    );

    // Yogya template usage
    await sequelize.query(
      `UPDATE itinerary_templates
       SET usage_count = GREATEST(usage_count, 28), updated_at = :now
       WHERE id = '44444444-4444-4444-8444-444444444401'`,
      { replacements: { now } },
    );

    console.log(
      `[demo-social-liveliness] users=${users.length} trips=${trips.length} follows=${follows.length} placesUsed=${places.length}`,
    );
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const tripIds = Array.from({ length: 30 }, (_, i) => demoUuid("trip", i + 1));
    const userIds = Array.from({ length: 24 }, (_, i) => demoUuid("user", i + 1));
    const roomIds = Array.from({ length: 30 }, (_, i) => demoUuid("room", i + 1));
    const versionIds = Array.from({ length: 30 }, (_, i) => demoUuid("version", i + 1));
    const dayIds = Array.from({ length: 30 }, (_, i) => demoUuid("day", i + 1));

    await queryInterface.bulkDelete("user_reviews", { reviewer_user_id: userIds });
    await queryInterface.bulkDelete("user_follows", { follower_user_id: userIds });
    await queryInterface.bulkDelete("notifications", { recipient_user_id: userIds });
    await queryInterface.bulkDelete("messages", { chat_room_id: roomIds });
    await queryInterface.bulkDelete("chat_rooms", { id: roomIds });
    await queryInterface.bulkDelete("trip_comments", { trip_id: tripIds });
    await queryInterface.bulkDelete("itinerary_stops", {
      itinerary_day_id: dayIds,
    });
    await queryInterface.bulkDelete("itinerary_days", { id: dayIds });

    await sequelize.query(
      `UPDATE trips SET current_itinerary_version_id = NULL WHERE id IN (:tripIds)`,
      { replacements: { tripIds } },
    );
    await queryInterface.bulkDelete("itinerary_versions", { id: versionIds });
    await queryInterface.bulkDelete("trip_join_requests", { trip_id: tripIds });
    await queryInterface.bulkDelete("trip_members", { trip_id: tripIds });
    await queryInterface.bulkDelete("trips", { id: tripIds });
    await queryInterface.bulkDelete("user_profiles", { user_id: userIds });
    await queryInterface.bulkDelete("users", { id: userIds });
  },
};

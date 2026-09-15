# Database schema — WIRA-D1

Acuan: `PRD.md` §8, `DOLAN_TECHNICAL_KICKOFF_FINAL.md` §9, `task-assignment.md` (WIRA-D1).

Package `@dolan/database` memakai `"type": "module"` untuk model TypeScript. Folder `migrations/` dan `seeders/` punya `package.json` lokal `"type": "commonjs"` agar Sequelize CLI tetap memuat file `.js` CommonJS.

## Ownership

- Owner migration/model/seeder: **Wira**
- Reviewer: **Alya**
- Migration yang sudah di-share tidak diedit; koreksi lewat migration baru

## Setup

1. Salin `.env.example` → `.env` dan isi `DATABASE_URL` atau `DB_*`
2. `npm install` di root (workspace `@dolan/database`)
3. `npm run db:migrate`
4. `npm run db:seed` (demo: provinces, places+foto cache, social liveliness)

## Demo seed & logins

```bash
npm run db:migrate
# Optional once: GOOGLE_MAPS_SERVER_KEY=... npm run db:seed
# Without the key, seed still fills places.cached_photo_url with Unsplash fallbacks
# (no Places calls at runtime). With the key, photos are downloaded to dolan/public/seed-places/.
npm run db:seed
# Re-run photos only:
npm run db:seed:photos
```

| Email | Password | Notes |
|---|---|---|
| `traveler01@dolan.demo` … `traveler24@dolan.demo` | `password123` | 24 travelers + public trips / chat / notif |
| `curator@dolan.local` | `password123` | Yogya curated template owner |
| Memory fallback (no DB): `verified@dolan.test` | `password123` | `AUTH_ADAPTER=local` memory users |

`GOOGLE_MAPS_SERVER_KEY` is needed for **seed-time** Places Text/Photo download only. Runtime Explore/home prefer `places.cached_photo_url` and skip Places quota when cache exists.

Scripts:

| Script | Fungsi |
|---|---|
| `npm run db:migrate` | Jalankan migration `up` |
| `npm run db:migrate:undo` | Undo migration terakhir |
| `npm run db:migrate:undo:all` | Undo semua |
| `npm run db:seed` | Seed demo |
| `npm run db:seed:undo` | Undo seed |
| `npm run db:verify` | Migrate/seed/undo round-trip memakai embedded Postgres |

## Naming

- Tabel dan kolom: `snake_case`
- Model TypeScript: PascalCase attribute camelCase (mapping `field`)
- ID internal: UUID (`gen_random_uuid()` via `pgcrypto`)
- Timestamp: `created_at` / `updated_at` dengan timezone DB
- Uang: `DECIMAL`; response API tetap string

## Urutan migration

1. `users`, `user_profiles`
2. `places`, `itinerary_templates`, `template_days`, `template_stops`
3. `trips`, `template_usages`, `trip_members`, `trip_join_requests`
4. `itinerary_versions`, `itinerary_days`, `itinerary_stops`, `budget_items`, `trip_checklist_items`
5. FK `trips.current_itinerary_version_id` + `itinerary_templates.source_trip_id` + trigger same-trip
6. `trip_comments`, `chat_rooms`, `messages`, `message_read_states`, `notifications`, `push_subscriptions`
7. `user_follows`, `user_reviews`, `location_shares`, `location_latest`, `user_blocks`, `reports`, `moderation_actions`
8. `generation_jobs`, `trip_share_links`, `api_usage_counters`, `idempotency_keys`
9. `posts`, `post_likes`, `post_comments` (momen beranda: foto + caption, like, komentar, tautan trip/template opsional)

## Constraint penting

- Unique: `auth_reference`, `email`, `username`, `google_place_id`, membership trip+user, join trip+user, review trip+reviewer+reviewee, message sender+client_message_id, chat room per trip, template usage template+created_trip
- Check: role/status enums, rating 1–5, biaya nonnegatif, `unit_cost_high >= unit_cost_low`, no self-follow/self-block/self-review
- Trigger: `current_itinerary_version_id` harus milik trip yang sama; reply komentar maksimal satu tingkat dan sama trip
- Index: public trip search, template search, chat pagination, notification inbox, generation job polling, My Trip `updated_at` (D4), job per user (D4)

Koreksi index: `database/migrations/20260913000100-add-d4-query-indexes.js`. Prosedur backup/rollback: `docs/release.md`.

## Seeder

- Provinsi Indonesia + template kurasi (featured)
- ~40 destinasi berfoto (`cached_photo_*`); Google Places hanya saat seed jika key ada
- Social liveliness: 24 user `@dolan.demo`, ~30 public trips, members/joins/comments/chat/notif/follows
- Kota demo klasik: Yogyakarta template (`curator@dolan.local`)
- Places memakai Google Place ID nyata bila di-resolve saat seed; tanpa key memakai `seed_{slug}` + Unsplash
- Template `source = CURATED` → label produk **Kurasi Dolan**
- Seed menaikkan `usage_count` beberapa template agar label popularitas muncul di demo

## Pemakaian dari server

```ts
import { getSequelize, initModels, assertDatabaseConnection } from "@dolan/database";

await assertDatabaseConnection();
const models = initModels();
```

Jangan memakai `sequelize.sync({ alter: true })`.

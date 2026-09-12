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
4. `npm run db:seed` (opsional, demo Yogyakarta)

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

## Constraint penting

- Unique: `auth_reference`, `email`, `username`, `google_place_id`, membership trip+user, join trip+user, review trip+reviewer+reviewee, message sender+client_message_id, chat room per trip, template usage template+created_trip
- Check: role/status enums, rating 1–5, biaya nonnegatif, `unit_cost_high >= unit_cost_low`, no self-follow/self-block/self-review
- Trigger: `current_itinerary_version_id` harus milik trip yang sama; reply komentar maksimal satu tingkat dan sama trip
- Index: public trip search, template search, chat pagination, notification inbox, generation job polling

## Seeder

- Kota demo: Yogyakarta
- Places memakai Google Place ID placeholder yang sudah disiapkan untuk development; validasi ulang sebelum production
- Template `source = CURATED` → label produk **Kurasi Dolan**
- `usage_count = 0` → tidak boleh dilabeli **Populer di Dolan**

## Pemakaian dari server

```ts
import { getSequelize, initModels, assertDatabaseConnection } from "@dolan/database";

await assertDatabaseConnection();
const models = initModels();
```

Jangan memakai `sequelize.sync({ alter: true })`.

# Release, backup, and security — WIRA-D4

Acuan: `PRD.md` §9, `task-assignment.md` (WIRA-D4). Reviewer: **Alya**.

## Live demo checklist (mock off)

Untuk data wisata nyata dan alur P0 tanpa simulasi:

| Variable | Required for |
|---|---|
| `NEXT_PUBLIC_USE_MOCK_API=false` | Homepage search + auth via Express (not typed mocks / "Salsa") |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` / `EXPRESS_ORIGIN` | Browser/BFF → Express |
| `AUTH_ADAPTER=local` | Password + Google OAuth + `auth_sessions` in Postgres (default) |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` / `REDIRECT_URI` | Tombol **Akun Google** (Express OAuth, tanpa Supabase) |
| `DATABASE_URL` (+ migrate, including local-auth migration) | Persistence for users/sessions |
| `GOOGLE_MAPS_SERVER_KEY` | Places Text Search / Details / Photos / Routes **at runtime**; also one-shot photo download during `db:seed` / `db:seed:photos` |
| `REDIS_URL` | Optional. Short-lived Places cache in Express (Jelajah, detail wisata, foto live, job place-lookup). Empty = in-memory per process |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | Maps JS on Explore / My Trip |
| `GROQ_API_KEY` (+ optional `GROQ_MODEL`) | AI itinerary / destination candidates |
| `IMAGEKIT_*` | Avatar/cover CDN |
| `EMAIL_PROVIDER_API_KEY` / `EMAIL_FROM` | Reset password (Resend) |

Auth Express: register/login email+password, atau Google OAuth (`/api/v1/auth/google`). Setelah seeder living demo: `living01@dolan.demo` / `password123` (living02–15). `traveler01–24` tidak di-seed. Plus `curator@dolan.local` / `password123`. Memory fallback: `verified@dolan.test` / `password123`. Foto destinasi seed tersimpan di `places.cached_photo_url` (+ opsional `dolan/public/seed-places/`); request user biasa tidak memanggil Places Photo bila cache ada. Tanpa Maps server key di runtime, Places jatuh ke `FakePlacesClient`. Cookie `dolan_session` memakai `Secure` saat `NODE_ENV=production`. Supabase Auth tidak dipakai.

## Staging migration

Migration yang sudah di-share **tidak diedit**. Koreksi lewat file baru di `database/migrations/`.

```bash
npm run db:migrate
```

Staging memakai `DATABASE_URL` direct connection, bukan transaction pooler. Verifikasi round-trip:

```bash
npm run db:verify
```

Undo satu langkah jika deploy gagal sebelum data baru masuk:

```bash
npm run db:migrate:undo
```

## Backup

Sebelum migrate staging/production, jalankan dari root repo (Node, jalan di Windows dan Unix):

```powershell
npm run db:backup
```

Butuh `DATABASE_URL` atau `MIGRATION_DATABASE_URL` dan `pg_dump` di PATH. File masuk `backups/dolan-YYYYMMDD.dump` (folder ini di-gitignore).

PowerShell manual:

```powershell
$stamp = Get-Date -Format yyyyMMdd
pg_dump $env:DATABASE_URL --format=custom --file="backups/dolan-$stamp.dump"
```

Jangan jadikan `location_latest` arsip jangka panjang. Restore:

```powershell
pg_restore --clean --if-exists --dbname=$env:DATABASE_URL backups/dolan-YYYYMMDD.dump
```

Rollback aplikasi: deploy commit sebelumnya, lalu `npm run db:migrate:undo` **hanya** jika migration baru itu yang bermasalah dan belum ada data dependan.

Verifikasi migration D4:

```powershell
npm run db:verify
```

## Rate limit

| Env | Default | Scope |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | 60000 | Jendela |
| `RATE_LIMIT_MAX` | 120 | `/api/v1` umum per IP |
| `RATE_LIMIT_SEARCH_MAX` | 40 | `/search` dan `/places` per IP |

Melebihi batas → `429 RATE_LIMITED` plus header `Retry-After`. `/health` dan `/ready` tidak dihitung. Tes menonaktifkan limiter kecuali tes D4.

## Quota Places

`PLACES_MAX_REQUESTS_PER_USER_PER_DAY` (default 50) ditulis ke `api_usage_counters` bersama `estimated_cost`. Biaya per request di `PLACES_ESTIMATED_COST_PER_REQUEST` (default 0.01, placeholder sampai SKU Google diukur). Increment memakai `WHERE request_count < limit`. Saat penuh → `429 QUOTA_EXCEEDED`. Cache hit Redis (atau in-memory jika `REDIS_URL` kosong) **tidak** memotong kuota dan **tidak** memanggil Google.

Lokal:

```bash
docker run -p 6379:6379 redis:7-alpine
```

Lalu set `REDIS_URL=redis://127.0.0.1:6379` di `.env`. TTL opsional: `PLACES_CACHE_TTL_SEARCH_SEC` (default 86400), `PLACES_CACHE_TTL_DETAILS_SEC` (604800), `PLACES_CACHE_TTL_PHOTO_SEC` (43200). Postgres `places` tetap menyimpan Place ID + foto seed; Redis hanya cache hasil Places ber-TTL.

## Index (audit + koreksi D4)

Sudah ada dari D1: public trip search, template city, chat pagination, notification inbox, job polling, membership trip+status.

Koreksi D4 (`20260913000100-add-d4-query-indexes.js`):

- `trips_updated_at_idx` — My Trip diurut `updated_at`
- `generation_jobs_requested_by_created_idx` — job milik user

Query sosial Salsa: unique `(follower, following)` + index `following_user_id`; unique block pair + `blocked_user_id`. Helper: `server/src/modules/social/social-queries.ts` (REST lengkap tetap milik Salsa). Server production meng-inject `SequelizeSocialStore` ke stub `POST /users/:userId/follow` jika database siap; tanpa DB memakai memory store.

## IDOR dan kapasitas

- Private/draft yang tidak diketahui actor → `404 TRIP_NOT_FOUND`
- Resource diketahui tetapi bukan host/member → `403`
- Query `?membership=` / `?role=` tidak boleh mengubah akses chat
- Dua accept pada sisa 1 kursi: satu berhasil, satu `409 TRIP_FULL` (row lock `FOR UPDATE`)
- Leave member memanggil `chat.evictFromRoom` agar socket tidak menerima event baru

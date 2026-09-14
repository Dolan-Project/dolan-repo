# Dolan — Final Technical Kickoff & Sprint Execution Plan

**Status:** Final, siap dieksekusi  
**Acuan produk:** `PRD.md` versi 1.1  
**Durasi sprint:** 4 hari  
**Tim:** Rusdi, Wira, Alya, Salsa

Dokumen ini memperjelas implementasi teknis dan koordinasi tim. Dokumen ini tidak mengganti flow atau aturan produk di `PRD.md`. Jika terjadi perbedaan, aturan produk di PRD berlaku dan keputusan teknis di dokumen ini disesuaikan.

## 1. Target dan Aturan Prioritas

Seluruh fitur PRD tetap berada dalam backlog produk. Dalam empat hari, tim mengutamakan alur demo end-to-end berikut:

1. Search kota dan tempat nyata dari Google.
2. Menampilkan itinerary kurasi dan itinerary populer berdasarkan penggunaan nyata di Dolan.
3. Register/login, melengkapi profil, membuat atau menyalin trip, menyusun itinerary, dan menghitung budget.
4. Memublikasikan trip, komentar, ajukan join, approve/reject, lalu chat anggota.
5. My Trip, notifikasi, PDF/share, follow, feedback, lokasi opt-in, moderasi dasar, dan PWA minimum.

Status prioritas pada Kanban:

- **P0:** wajib berfungsi end-to-end untuk demo.
- **P1:** wajib diimplementasikan setelah seluruh P0 terintegrasi.
- **P2:** penyempurnaan UI, performa, dan device behavior setelah P0/P1 stabil.

Fitur tidak boleh diganti dengan simulasi pada build final. Mock hanya digunakan agar frontend dan backend dapat berkembang paralel.

## 2. Keputusan Teknologi Final

| Area | Keputusan |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL melalui Supabase |
| ORM | Sequelize |
| Migration/seeder | Sequelize CLI; file migration dan seeder JavaScript CommonJS |
| Model/service | TypeScript |
| Validasi | Zod shared schema |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Realtime | Socket.IO pada Express server |
| AI | Groq structured JSON output |
| Tempat/peta/rute | Google Places New, Maps JavaScript, Routes API, Maps URLs |
| PDF | `@react-pdf/renderer` |
| Offline | Service worker + IndexedDB untuk itinerary yang dipilih user |
| Test | Vitest, Supertest, Playwright |
| Package manager | npm |

Supabase Realtime tidak digunakan. Tidak ada sistem auth kedua, password lokal, atau session table buatan aplikasi.

## 3. Struktur Repository Final

Next.js yang sudah ada tetap berada di folder `dolan`; tidak dilakukan pemindahan besar ke `apps/web`.

```text
dolan-repo/
├── PRD.md
├── README.md
├── dolan/                       # Next.js frontend yang sudah ada
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   ├── mocks/
│   └── public/
├── server/                      # Express + Socket.IO
│   └── src/
│       ├── config/
│       ├── integrations/
│       ├── middleware/
│       ├── modules/
│       ├── socket/
│       └── server.ts
├── worker/                      # polling generation_jobs
│   └── src/
│       ├── jobs/
│       └── worker.ts
├── shared/                      # types dan Zod schema
│   └── src/
│       ├── api/
│       ├── constants/
│       ├── schemas/
│       └── types/
├── database/
│   ├── config/
│   ├── migrations/
│   ├── models/
│   ├── seeders/
│   └── index.ts
├── docs/
│   ├── api-contract.md
│   ├── database.md
│   └── realtime-events.md
├── .env.example
├── .sequelizerc
└── package.json                 # root scripts/workspaces
```

Root menggunakan npm workspaces untuk `dolan`, `server`, `worker`, `shared`, dan `database`. Struktur ini mempertahankan aplikasi yang ada sekaligus memungkinkan type sharing.

## 4. Ownership dan Aturan Perubahan

| Area | Owner | Reviewer utama |
|---|---|---|
| Database, migration, seeder | Wira | Alya |
| Auth, worker, Socket.IO, privacy | Alya | Wira |
| Design system, search, itinerary editor | Rusdi | Salsa/Wira |
| Auth UI, My Trip, social UI, PWA | Salsa | Rusdi/Alya |
| Shared types/Zod | Owner fitur | Minimal 1 frontend + 1 backend |

Aturan:

- Wira satu-satunya merger migration ke branch utama.
- Migration yang telah dibagikan tidak diedit; perubahan dibuat melalui migration baru.
- Frontend tidak mendefinisikan ulang response API.
- Backend tidak mengubah response tanpa memperbarui shared schema dan mock.
- Perubahan flow PRD harus dibahas seluruh tim.
- Satu kartu Kanban menggunakan satu branch dan satu pull request.

## 5. Auth dan Session

Alur auth dikunci sebagai berikut:

1. Browser mengirim register, login, logout, verifikasi, dan reset password hanya ke Next.js route handler/server action.
2. Next.js memanggil Supabase Auth dan menyimpan access/refresh token dalam secure HttpOnly cookie melalui helper SSR Supabase.
3. Next.js menjadi backend-for-frontend: route handler membaca session cookie dan meneruskan access token ke Express melalui `Authorization: Bearer <token>`. Token tidak pernah dikirim ke JavaScript browser atau disimpan di localStorage.
4. Express tidak mempunyai endpoint login kedua. Express memvalidasi bearer token ke Supabase, lalu melakukan upsert user berdasarkan `auth_reference` yang unik. `role` dan `status` tidak pernah diterima dari client.
5. Socket.IO terhubung dengan `withCredentials: true`. Browser mengirim cookie secara otomatis; server membaca dan memvalidasi cookie Supabase saat handshake. Client tidak mengirim `auth.accessToken`.
6. Logout menghapus cookie Supabase, mencabut session provider, dan memutus seluruh socket milik user tersebut.
7. Refresh token hanya ditangani middleware/helper Supabase di Next.js. Express dan Socket.IO tidak menyimpan refresh token.

Cookie production:

- `HttpOnly=true`
- `Secure=true`
- `SameSite=Lax`
- `Path=/`
- production memakai domain utama untuk web dan subdomain API dari site yang sama; CORS hanya mengizinkan origin web dan `credentials: true`.

Email terverifikasi diperlukan untuk publish, join, komentar, dan follow. Profil lengkap (`username`, `displayName`, `domicile`) diperlukan untuk publish dan join.

## 6. Format API dan Error

Base URL: `/api/v1`

```ts
type ApiSuccess<T> = { success: true; data: T };

type ApiPage<T> = {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
};
```

Status standar: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`, `502`, `503`.

Operasi create/approve/generate menerima `Idempotency-Key` UUID. Server menyimpan response pertama dan mengembalikan response yang sama untuk retry key yang sama dari actor yang sama.

## 7. Enum Shared

```ts
type UserRole = "USER" | "ADMIN";
type UserStatus = "ACTIVE" | "RESTRICTED" | "SUSPENDED";
type TripVisibility = "PRIVATE" | "PUBLIC";
type TripStatus = "DRAFT" | "OPEN" | "CLOSED" | "ONGOING" | "COMPLETED" | "CANCELLED";
type TripMemberRole = "HOST" | "PARTICIPANT";
type MembershipStatus = "ACTIVE" | "LEFT" | "REMOVED";
type JoinRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
type AttendanceStatus = "UNCONFIRMED" | "PRESENT" | "ABSENT" | "DISPUTED";
type GenerationJobStatus = "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED";
type ItinerarySource = "MANUAL" | "AI" | "TEMPLATE" | "REGENERATED";
type TemplateSource = "CURATED" | "USER_TRIP";
type ModerationStatus = "VISIBLE" | "HIDDEN" | "UNDER_REVIEW";
type LocationScope = "TRIP_PRECISE" | "PUBLIC_APPROXIMATE";
type BudgetBasis = "PER_PERSON" | "GROUP";
```

## 8. Shared Response Types

```ts
type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  domicile: string | null;
  followersCount: number;
  followingCount: number;
  hostTripCount: number;
  participantTripCount: number;
  rating: {
    overall: number | null;
    communication: number | null;
    attitude: number | null;
    reviewCount: number;
  };
};

type PlaceSummary = {
  googlePlaceId: string;
  name: string;
  formattedAddress: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  userRatingCount: number | null;
  photoName: string | null;
  googleMapsUrl: string | null;
};

type ItineraryTemplateSummary = {
  id: string;
  title: string;
  city: string;
  durationDays: number;
  source: TemplateSource;
  sourceLabel: "Kurasi Dolan" | "Dari traveler Dolan";
  usageCount: number;
  popularityLabel: "Populer di Dolan" | null;
  coverPlace: PlaceSummary | null;
};

type BudgetItem = {
  id: string;
  category: string;
  label: string;
  quantity: string;
  unit: string;
  unitCostLow: string;
  unitCostHigh: string;
  subtotalLow: string;
  subtotalHigh: string;
  sourceType: string;
  sourceReference: string | null;
  checkedAt: string | null;
  notes: string | null;
};

type BudgetSummary = {
  currency: "IDR";
  basis: BudgetBasis;
  totalLow: string;
  totalHigh: string;
  items: BudgetItem[];
};

type ItineraryStop = {
  id: string;
  sequence: number;
  place: PlaceSummary | null;
  customTitle: string | null;
  activityType: string;
  startTime: string | null;
  durationMinutes: number;
  travelDurationMinutes: number | null;
  notes: string | null;
  isLocked: boolean;
};

type ItineraryDay = {
  id: string;
  dayNumber: number;
  date: string;
  title: string | null;
  stops: ItineraryStop[];
};

type ItineraryVersion = {
  id: string;
  tripId: string;
  versionNumber: number;
  source: ItinerarySource;
  summary: string | null;
  assumptions: string[];
  days: ItineraryDay[];
  budget: BudgetSummary;
  createdAt: string;
};
```

Nominal decimal selalu dikirim sebagai string.

## 9. Database Schema Final

Semua tabel memakai UUID dan timestamp dengan zona waktu. Foreign key memakai `RESTRICT` untuk data histori penting dan `CASCADE` hanya untuk child yang tidak bermakna tanpa parent, seperti day/stop draft.

### Identity dan profile

- `users`: `auth_reference UNIQUE`, `email UNIQUE`, `role`, `status`, `email_verified_at`.
- `user_profiles`: `user_id UNIQUE`, `username UNIQUE`, `display_name`, `avatar_url`, `cover_url`, `cover_caption`, `bio`, `domicile`.

### Places dan template

- `places`: `google_place_id UNIQUE`, `cached_name`, `cached_city`, `cached_latitude`, `cached_longitude`, `cache_checked_at`, `status`. Cache hanya untuk operasi aplikasi yang diizinkan dan harus direvalidasi sesuai kebijakan Google.
- `itinerary_templates`: creator/source trip, title, description, city, duration, transport, source, publication status, permission timestamp, `usage_count`.
- `template_days`: template, day number, title; unique template/day.
- `template_stops`: day, place, sequence, activity, duration, notes; unique day/sequence.
- `template_usages`: template, user, created trip, used time; unique template/created trip.

### Trip dan itinerary

- `trips`: host, title, description, visibility, status, dates, timezone, private origin, destination city, meeting point, transport, budget, planning party size, capacity, current version.
- `trip_members`: trip/user unique, role, membership status, attendance fields, profile visibility, joined/left timestamps.
- `trip_join_requests`: trip/user unique, message, status, reviewer, reviewed time.
- `itinerary_versions`: trip/version number unique, creator, source, summary, assumptions.
- `itinerary_days`: version/day number unique, date, title.
- `itinerary_stops`: day/sequence unique, place/custom title, time, duration, travel duration, lock, notes.
- `budget_items`: version, optional stop, category, label, quantity, unit, low/high unit cost, source, checked time, notes.
- `trip_checklist_items`: trip, optional owner user, title, due date, completion.

### Komunikasi

- `trip_comments`: trip, user, optional parent, body, deleted time. Parent harus berasal dari trip sama dan tidak boleh memiliki parent lain.
- `chat_rooms`: `trip_id UNIQUE`, read-only timestamp.
- `messages`: room, sender, `client_message_id`, body, sent time, deleted time; unique sender/client message ID.
- `message_read_states`: room/user unique, last read message, read time.
- `notifications`: recipient, optional actor, type, target type/id, data JSONB tanpa rahasia, read time.
- `push_subscriptions`: user, endpoint unique, keys terenkripsi, revoked time.

### Sosial, lokasi, moderasi

- `user_follows`: follower/following unique; check bukan diri sendiri.
- `user_reviews`: trip/reviewer/reviewee unique, communication 1–5, attitude 1–5, comment, moderation status.
- `location_shares`: user, optional trip, scope, expiry, revoked time.
- `location_latest`: share unique, coordinates, accuracy, recorded time; dihapus saat revoke/expiry.
- `user_blocks`: blocker/blocked unique; check bukan diri sendiri.
- `reports`: reporter, tepat satu target type/id, reason, description, status.
- `moderation_actions`: report, admin actor, action, reason, timestamp.

### Job, share, usage, idempotency

- `generation_jobs`: trip, requester, type, status, idempotency key, result version, attempt count, locked by/at, started/finished times, error code.
- `trip_share_links`: trip, creator, `token_hash UNIQUE`, expiry, revoked time, permitted fields JSONB.
- `api_usage_counters`: provider, operation, period, optional user, request count, estimated cost; composite unique provider/operation/period/user.
- `idempotency_keys`: actor, operation, key, request hash, response status/body, expiry; unique actor/operation/key.

Constraint penting dijalankan di database dan service. Approval kursi terakhir menggunakan transaction dan row lock pada trip. `usage_count` diperbarui atomik, sedangkan `template_usages` tetap sumber kebenaran untuk rekonsiliasi.

## 10. Tiga Definisi Popularitas

Ketiganya tidak boleh dicampur:

1. **Destinasi populer:** jumlah trip `PUBLIC` berstatus `OPEN` atau `ONGOING` yang itinerary aktifnya mengunjungi place tersebut.
2. **Trip populer:** jumlah participant aktif non-host, kemudian jumlah join request pending sebagai tie-breaker.
3. **Template populer:** jumlah `template_usages`, yaitu template yang berhasil disalin menjadi draft trip.

Template seeder diberi label **Kurasi Dolan**. Label **Populer di Dolan** hanya muncul jika `usage_count > 0`. Tidak ada klaim populer di seluruh komunitas backpacker Indonesia tanpa sumber eksternal.

## 11. API Surface Final

### Public search

- `GET /search/cities?q=` — kandidat kota Indonesia.
- `GET /search/places?q=&city=&sort=&lat=&lng=&page=&limit=` — Places Google.
- `GET /search/trips?q=&city=&sort=&dateFrom=&dateTo=&page=&limit=` — public trips saja.
- `GET /places/:googlePlaceId` — detail Google dan atribusi.
- `GET /places/:googlePlaceId/trips` dan `/templates`.
- `GET /templates?city=&sort=popular&page=&limit=` dan `GET /templates/:id`.

### Auth/profile/social

- Next.js route handlers: register, login, logout, verification callback, forgot password, dan reset password.
- Express: `GET /auth/session` untuk identitas aplikasi setelah bearer token tervalidasi; tidak ada endpoint password/login Express.
- Get/update profile, avatar, cover, history, reviews, followers, following.
- Follow/unfollow dan block/unblock.

### Trip lifecycle

- Create/read/update/delete draft.
- My Trip dengan role host/participant/pending.
- Publish, close, reopen, start, complete, cancel.
- Change visibility dengan validasi PRD.
- Leave trip untuk participant.

### Planning

- List/create/update/select itinerary version.
- Generate/regenerate dan read job.
- CRUD checklist.
- Use template dan publish permitted trip as template.
- Generate Maps URL per day/segment.
- Generate PDF.

### Collaboration

- List/create/review/withdraw join request.
- List/create/update/delete comment.
- List/create/read-state messages.
- List/read notifications dan create/delete push subscription.
- Start/update/stop location share.
- Create/revoke/read limited share link.
- Attendance confirmation dan review.
- Create report; admin list/review report dan manage curated template.

Setiap endpoint di `docs/api-contract.md` wajib memiliki actor, Zod request schema, response type, error codes, pagination, dan idempotency policy sebelum kartu frontend/backend terkait masuk `In Progress`.

### Kontrak P0 yang dikunci

| Operasi | Actor | Request utama | Response utama | Error khusus | Idempotency |
|---|---|---|---|---|---|
| Search places | Public | `q`, kota, sort, koordinat opsional, page/limit | `ApiPage<PlaceSummary>` | `PROVIDER_UNAVAILABLE`, `QUOTA_EXCEEDED` | Deduplikasi query, bukan key |
| Search public trips | Public | kota/query/tanggal/sort/page | `ApiPage<TripSummary>` | `INVALID_FILTER` | Tidak perlu |
| Search templates | Public | kota/sort/page | `ApiPage<ItineraryTemplateSummary>` | `INVALID_CITY` | Tidak perlu |
| Use template | Login | template ID, asal, tanggal, moda, peserta, budget | Draft trip + selected itinerary | `TEMPLATE_UNAVAILABLE`, `INVALID_PLAN_INPUT` | Wajib |
| Create trip | Login | field F05 | Draft trip | `INVALID_DATE`, `INVALID_BUDGET` | Wajib |
| Generate itinerary | Pemilik draft | trip ID dan preference | Generation job | `JOB_ALREADY_ACTIVE`, `QUOTA_EXCEEDED` | Wajib |
| Publish trip | Verified + profil lengkap + host | trip ID, visibility/capacity/meeting point | Published trip | `PROFILE_INCOMPLETE`, `INVALID_TRANSITION` | Wajib |
| Request join | Verified + profil lengkap | trip ID dan message opsional | Join request | `TRIP_FULL`, `DUPLICATE_REQUEST`, `BLOCKED_RELATION` | Wajib |
| Review join | Host | request ID dan accept/reject | Join request + membership saat accepted | `TRIP_FULL`, `INVALID_TRANSITION` | Wajib |
| Comment | Verified | trip ID, body, parent opsional | Comment | `INVALID_PARENT`, `TRIP_NOT_PUBLIC` | Wajib untuk create |
| Send message | Host/participant aktif | trip ID, `clientMessageId`, body | Persisted message | `NOT_MEMBER`, `ROOM_READ_ONLY` | `clientMessageId` |
| Read My Trip | Login | role filter/page | `ApiPage<TripSummary>` | `INVALID_FILTER` | Tidak perlu |

Semua body mutasi divalidasi Zod di boundary. Resource private yang bukan milik actor menggunakan `404`, sedangkan actor yang mengetahui resource tetapi tidak boleh melakukan tindakan menggunakan `403`.

## 12. Socket.IO

Event: `trip.updated`, `join_request.created`, `join_request.reviewed`, `message.created`, `notification.created`, `location.updated`, `location.stopped`, dan `generation.updated`.

Aturan:

- Room trip hanya diikuti setelah server memeriksa membership aktif.
- Pending tidak menerima chat atau lokasi presisi.
- Message disimpan sebelum event dikirim.
- `clientMessageId` mencegah duplikasi reconnect.
- Keluar/removal/revoke langsung menghapus socket dari room.
- Trip cancelled membuat room read-only.
- Event membawa ID dan timestamp; client refetch data durable melalui REST.

## 13. Worker dan Job

Worker memakai tabel `generation_jobs`, tanpa Redis pada sprint ini:

1. Poll job `QUEUED` setiap 2 detik.
2. Claim satu job dengan transaction, `FOR UPDATE SKIP LOCKED`, `locked_by`, dan `locked_at`.
3. Ubah ke `PROCESSING`, panggil Groq/Routes, validasi output dengan Zod, lalu simpan itinerary version.
4. Maksimal dua retry untuk error sementara dengan backoff.
5. Error validasi/provider permanen menjadi `FAILED` dengan `error_code` aman.
6. Job `PROCESSING` yang lock-nya lebih dari 5 menit dikembalikan ke queue jika attempt masih tersedia.
7. Hasil lama tetap aktif sampai user memilih versi baru.

Backend tetap menghitung subtotal dan total budget. AI tidak menjadi kalkulator final.

## 14. Environment Variables

`.env.example` memuat nama berikut tanpa nilai rahasia:

```dotenv
NODE_ENV=development
WEB_URL=http://localhost:3000
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_USE_MOCK_API=true
DATABASE_URL=
MIGRATION_DATABASE_URL=
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=dolan-assets
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=
GOOGLE_MAPS_SERVER_KEY=
GROQ_API_KEY=
GROQ_MODEL=
COOKIE_DOMAIN=
CORS_ALLOWED_ORIGINS=http://localhost:3000
SOCKET_PATH=/socket.io
WORKER_ID=worker-1
JOB_POLL_INTERVAL_MS=2000
JOB_LOCK_TIMEOUT_MS=300000
LOCATION_STALE_SECONDS=120
LOCATION_HIDE_SECONDS=600
AI_MAX_REGENERATE_PER_USER_PER_DAY=
PLACES_MAX_REQUESTS_PER_USER_PER_DAY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=
SHARE_TOKEN_SECRET=
LOG_LEVEL=info
```

Google memakai satu server key yang dibatasi untuk Places dan Routes; tidak perlu tiga server key terpisah. Migration memakai direct connection, bukan transaction pooler.

## 15. Deployment Final

- Next.js: Vercel.
- Express + Socket.IO + worker: Railway sebagai dua process dari repository yang sama.
- PostgreSQL/Auth/Storage: Supabase.
- Domain: web di domain utama; API/socket di subdomain API.
- HTTPS/WSS wajib.
- Railway health check menggunakan `/health` dan `/ready`.
- Migration dijalankan satu kali sebelum release API.
- Rollback aplikasi memakai deployment sebelumnya; migration destructive tidak dibuat dalam sprint.
- Error monitoring minimal memakai structured logs dan request ID; provider usage dicatat di `api_usage_counters`.

## 16. Mock Contract

Rusdi dan Salsa boleh mulai dari mock yang mengimpor shared types. Mock wajib menyediakan success, empty, unauthorized, validation error, quota error, dan provider error. Ketika API selesai, hanya adapter request yang diganti.

Mock Google diberi label development dan tidak ikut seed production. Seeder template kurasi diperbolehkan sesuai PRD dan memakai Google Place ID yang telah diverifikasi tim.

## 17. Kanban Empat Hari

### Kartu bersama

**TEAM-D1 — Lock Shared Contract & Integration Skeleton (P0, maksimal 2 jam)**

- Wira: database connection, Sequelize CLI, seluruh migration dan association baseline.
- Alya: Supabase validation, authorization middleware, dan Socket.IO cookie skeleton.
- Rusdi: API client, shared response types, dan UI foundation.
- Salsa: Next.js auth route skeleton serta typed mock auth/trip/place/template.
- Selesai ketika Next.js membaca `/health`, shared types dapat diimpor semua package, seluruh migration/seed berjalan, login mencapai Express, Socket.IO memvalidasi cookie, dan kontrak P0 telah direview.

Tidak ada kartu fitur yang masuk `In Progress` sebelum kartu bersama ini selesai.

### Rusdi

1. **RUSDI-D1 — Homepage, Design System & Typed Search Client (P0):** navigation, hero, search state, card components, loading/error/reduced motion, shared search types, dan mock/API adapter. Reviewer: Salsa untuk UI, Wira untuk kontrak.
2. **RUSDI-D2 — Explore Map, Place Detail & Popular Results (P0):** tab place/trip/template, pagination, map-card sync, bottom sheet, Google attribution, serta filter/sort mapping bersama Wira. Dependency: WIRA-D2 atau typed mock. Reviewer: Wira.
3. **RUSDI-D3 — Itinerary Editor, Checklist & Budget (P0):** version selection, stop ordering, locks, duration, checklist, budget UI, mutation schema, dan itinerary service bersama Alya. Dependency: ALYA-D2. Reviewer: Alya.
4. **RUSDI-D4 — Planning Flow Integration & Accessibility (P0/P2):** search → detail → use template → edit → save/publish, response race, provider failure, keyboard, touch, mobile, dan reduced motion. Reviewer: Salsa/Wira.

### Wira

1. **WIRA-D1 — Complete Sequelize Database Baseline (P0):** seluruh tabel identity, place, template, trip, itinerary, comment, chat, notification, social, location, job, share, usage, dan idempotency; associations, indexes, constraints, migration up/down, serta seed template. Reviewer: Alya.
2. **WIRA-D2 — Google Search & Popularity APIs (P0):** Places/detail, public trip search, tiga ranking popularitas, template use transaction.
3. **WIRA-D3 — Trip Lifecycle, Join & Comment APIs (P0):** transitions, visibility, capacity lock, memberships, join review/withdraw, comments, block check, dan leave trip. Dependency: ALYA-D1. Reviewer: Alya/Salsa.
4. **WIRA-D4 — Database Security & Release (P0/P1):** migration koreksi saja, IDOR/concurrency tests, indexes, rate limit, quota logging, staging migration, backup/rollback, serta bantuan query social Salsa. Reviewer: Alya.

### Alya

1. **ALYA-D1 — Supabase Session & Authorization Foundation (P0):** Express validation, user upsert, verified/profile/role guards, Socket.IO cookie authentication, logout disconnect, dan upload authorization. Reviewer: Wira/Salsa.
2. **ALYA-D2 — AI Worker, Routing & Generation Jobs (P0):** claim/retry/recovery, structured validation, version persistence, server-calculated budget.
3. **ALYA-D3 — Socket.IO Chat & Notifications (P0):** authorized rooms, persistence-first messages, reconnect/dedup, stored notifications.
4. **ALYA-D4 — Location, Share, PDF & Privacy Tests (P1):** opt-in/expiry/revoke, public quantization, limited links, Maps URL, selected-version PDF, dan permission regression. Reviewer: Salsa/Wira.

### Salsa

1. **SALSA-D1 — Auth Routes & Profile Fullstack Experience (P0):** Next.js register/login/logout/verification/reset handlers, auth/profile/upload screens, return-to-action, profile schemas, dan typed mocks. Dependency: ALYA-D1 contract. Reviewer: Alya/Rusdi.
2. **SALSA-D2 — Create Trip, My Trip & Detail UI (P0):** draft/public/private, role views, lifecycle actions, map selection; backend contribution berupa request schemas.
3. **SALSA-D3 — Join, Comment, Approval & Chat UI (P0):** free-join labels, pending rules, host panel, chat/reconnect/unread.
4. **SALSA-D4 — Social APIs, Social UI, Moderation & PWA (P1):** follow/unfollow, attendance/review, block/report dan admin report endpoint sederhana beserta UI; service worker, explicit itinerary offline cache, dan logout cache cleanup. Alya wajib mereview authorization dan Wira mereview Sequelize query.

Reviewer silang: Rusdi ↔ Salsa dan Wira ↔ Alya; integrasi frontend/backend direview satu orang dari pasangan lain.

## 18. Jadwal Integrasi

- Hari 1 pukul 10.00: shared contract, auth/session flow, dan integration skeleton selesai.
- Hari 1 pukul 17.00: seluruh migration/association/seed baseline, typed mocks, dan auth foundation selesai; setelah titik ini migration hanya berupa koreksi.
- Setiap hari pukul 12.00: contract sync dan merge kecil.
- Setiap hari pukul 17.00: staging integration dan demo internal.
- Hari 3 pukul 17.00: feature freeze untuk P0.
- Hari 4 pukul 12.00: freeze seluruh fitur; hanya bug, security, deployment, dan demo data.
- Hari 4 pukul 17.00: final regression dan latihan demo.

Perubahan shared contract setelah freeze hanya boleh untuk blocker dan harus diumumkan kepada seluruh tim.

## 19. Definition of Ready dan Done

Kartu siap dikerjakan jika flow PRD, actor, endpoint, shared schema/mock, dependency, reviewer, dan acceptance criteria sudah tersedia.

Kartu selesai jika frontend/backend terintegrasi, validasi dan akses server diuji, loading/empty/error tersedia, double-click aman, mobile diperiksa, tidak ada secret/private data dalam log, test relevan lulus, dan fitur berjalan di staging.

## 20. Test Gate Sebelum Demo

Wajib lulus:

1. Search kota menampilkan Places nyata, trip public, template kurasi, dan template populer dengan metrik berbeda.
2. Template tanpa penggunaan tidak disebut populer; satu salinan sukses menambah satu penggunaan; retry tidak menggandakan.
3. Draft/private tidak dapat dibaca user lain atau muncul di public search.
4. Publish membuat host membership dan satu chat room secara atomik.
5. Dua approval pada kursi terakhir tidak overbook.
6. Pending dapat berkomentar tetapi tidak membaca chat REST/socket.
7. Message reconnect tidak duplikat; user keluar tidak menerima event baru.
8. AI/Google/quota failure tidak menghapus draft atau current version.
9. Budget total diverifikasi server dan tidak disebut harga join.
10. Stop/expiry location menghapus latest position; public location tidak presisi.
11. PDF/share memakai selected version; revoked link ditolak.
12. Review hanya dari peserta trip selesai yang memenuhi syarat; tidak ada self-review/duplikasi.
13. Logout membersihkan cache pribadi offline dan memutus socket.
14. Mobile bottom sheet, keyboard, reduced motion, dan izin GPS ditolak tetap usable.

## 21. Keputusan yang Tidak Boleh Diubah Sepihak

- Join gratis; tidak ada payment/deposit/host payout.
- Kapasitas termasuk host.
- Popularitas template berasal dari salinan nyata di Dolan.
- `template_usages` merupakan sumber kebenaran; `usage_count` hanya counter teroptimasi.
- Template seed berlabel Kurasi Dolan.
- Tempat nyata berasal dari Google; mock tidak masuk production.
- Browser tidak menyimpan auth token di localStorage.
- Supabase Realtime tidak digunakan.
- Sequelize migration menjadi sumber schema database.
- Chat dan lokasi presisi hanya untuk host serta participant aktif.
- Socket.IO menggunakan cookie credential; browser tidak membaca access token HttpOnly.
- Auth UI/provider dimiliki Next.js; Express hanya memvalidasi identitas dan otorisasi resource.
- Seluruh tabel yang dibutuhkan Hari 2–4 tersedia sejak akhir Hari 1.
- Semua flow produk tetap mengikuti `PRD.md`.

## 22. Catatan Kapasitas Sprint

Empat hari dari starter kosong merupakan jadwal berisiko tinggi. Dokumen ini mengurangi risiko integrasi, tetapi tidak menjamin seluruh P1/P2 selesai jika provider credential, deployment, atau API policy terlambat. P0 tidak boleh dikorbankan untuk menyelesaikan fitur P1/P2 secara setengah jadi. Setiap scope yang tidak selesai tetap terlihat di Kanban dan tidak boleh dipresentasikan sebagai fitur aktif.

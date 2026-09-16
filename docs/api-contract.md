# API contract

Tipe dan Zod hidup di `@dolan/shared`.

## Auth & profile (SALSA-D1)

Owner: **Salsa**. Kontrak session Express ada di `docs/auth-contract.md` (Alya).

### Next.js auth

| Method | Path |
| ------ | --------------------------- |
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| GET | `/api/auth/callback` |
| POST | `/api/auth/forgot-password` |
| POST | `/api/auth/reset-password` |

Response login/register: `ApiSuccess<AuthSession>`. `AuthSession` = `{ user: PublicUser, emailVerified, profileComplete }`. Password/token tidak dikembalikan.

Return-to-action: query/body `next`; invalid → `/`. Tidak auto-submit join/publish/komentar.

### Express `/api/v1` (Salsa domain)

| Method | Path |
| --------- | ----------------------------- |
| GET/PATCH | `/users/me` |
| GET | `/users/:username` |
| POST | `/users/me/avatar` |
| POST | `/users/me/cover` |
| POST | `/trips` |
| GET | `/trips/me` |
| GET | `/trips/:id` |
| POST | `/trips/:id/publish` |
| POST | `/trips/:id/join-requests` |
| POST | `/join-requests/:id/review` |
| POST | `/join-requests/:id/withdraw` |
| GET/POST | `/trips/:id/comments` |
| GET/POST | `/trips/:id/messages` |

Pending bukan member chat. Join tanpa pembayaran. Endpoint trip Express (lifecycle, join, komentar) dimiliki **Wira** — lihat bagian WIRA-D3 di bawah. Salsa memakai path yang sama untuk UI.

`PATCH /users/me` body: `{ username, displayName, domicile, bio?, coverCaption?, instagramUrl?, tiktokUrl? }`. `instagramUrl` dan `tiktokUrl` opsional (bukan syarat `profileComplete`): username, `@handle`, atau URL penuh; disimpan sebagai URL kanonik Instagram/TikTok. Tampil di profil publik dan kartu host trip.

---

# Search, places, templates (WIRA-D2)

Acuan: `PRD.md` F01–F03/F08, `DOLAN_TECHNICAL_KICKOFF_FINAL.md` §10–§11, `task-assignment.md` (WIRA-D2).

Dokumen ini untuk Rusdi (Explore/detail) dan reviewer Alya.

Owner endpoint: **Wira**. Reviewer: **Rusdi**, **Alya**.

Base: `/api/v1`

Envelope:

- Sukses satu objek: `ApiSuccess<T>` → `{ success: true, data }`
- Sukses list: `ApiPage<T>` → `{ success: true, data, pagination }`
- Error: `{ success: false, error: { code, message, fields?, requestId } }`

Pagination default: `page=1`, `limit=10`, `limit` maksimum 20.

Guest boleh semua GET di bawah. `POST /templates/:id/use` wajib Bearer (capability `create_draft`). Token tidak dikembalikan di body.

---

## Popularitas

Tiga metrik tidak dicampur:

| Objek | Rumus | Label |
|---|---|---|
| Destinasi | Jumlah trip `PUBLIC` berstatus `OPEN` atau `ONGOING` yang itinerary aktifnya mengunjungi place | `visitCount` pada `PlaceSummary` / `PlaceDetails` |
| Trip | Peserta aktif non-host, lalu join pending sebagai tie-breaker | `participantCount`, `pendingRequestCount` |
| Template | Jumlah salinan sukses (`template_usages` / `usageCount`) | `popularityLabel`: `"Populer di Dolan"` hanya jika `usageCount > 0` |

Template `source = CURATED` → `sourceLabel`: `"Kurasi Dolan"`. `USER_TRIP` → `"Dari traveler Dolan"`. Melihat template tidak menambah usage.

Kota dinormalisasi (`Kota Yogyakarta`, `Jogja` → `Yogyakarta`).

---

## `GET /search/cities`

**Actor:** public  
**Schema:** `citySearchQuerySchema` — `q?`  
**Response:** `ApiSuccess<CityCandidate[]>`  
**Idempotency:** tidak perlu

`CityCandidate`: `{ name, countryCode: "ID" }`

**Error:** `INVALID_FILTER` (400)

---

## `GET /search/places`

**Actor:** public  
**Schema:** `placeSearchQuerySchema`

| Query | Keterangan |
|---|---|
| `q` | Wajib, nama destinasi |
| `city` | Opsional |
| `sort` | `relevance` (default), `popular`, `nearest` |
| `lat`, `lng` | Opsional; **wajib** jika `sort=nearest` |
| `page`, `limit` | Pagination |

**Response:** `ApiPage<PlaceSummary>`  
**Idempotency:** deduplikasi query di server, bukan `Idempotency-Key`

Hotel/resto diturunkan kecuali query memang lodging/makan. `sort=popular` memakai `visitCount` Dolan.

**Error:**

| Code | HTTP |
|---|---|
| `INVALID_FILTER` | 400 |
| `QUOTA_EXCEEDED` | 429 |
| `PROVIDER_UNAVAILABLE` | 502/503 |

Quota Places: `PLACES_MAX_REQUESTS_PER_USER_PER_DAY` (default 50), dicatat di `api_usage_counters`. Cache hit Places (Redis / in-memory) tidak memotong kuota.

---

## `GET /search/trips`

**Actor:** public  
**Schema:** `tripSearchQuerySchema`

| Query | Keterangan |
|---|---|
| `q` | Opsional, judul |
| `city` | Opsional |
| `sort` | `soonest` (default, tanggal berangkat terdekat), `popular`, `nearest` (titik mulai publik terdekat). `recent` alias `soonest`. |
| `lat`, `lng` | Opsional; **wajib** jika `sort=nearest` |
| `dateFrom`, `dateTo` | Filter tanggal rencana |
| `page`, `limit` | Pagination |

**Response:** `ApiPage<TripSummary>`  
**Idempotency:** tidak perlu

Hanya trip `PUBLIC` yang bukan `DRAFT`/`CANCELLED`. Private tidak pernah muncul. `soonest` mengurutkan keberangkatan mendatang dulu (hari ini di `Asia/Jakarta`), lalu trip yang sudah lewat, lalu yang tanpa tanggal. `nearest` memakai koordinat meeting point publik, bukan asal pribadi host. Penolakan izin lokasi: jangan kirim `sort=nearest`; default `soonest` tetap jalan.

**Error:** `INVALID_FILTER` (400)

---

## `GET /places/:googlePlaceId`

**Actor:** public  
**Response:** `ApiSuccess<PlaceDetails>`  
**Idempotency:** tidak perlu

Field mask Google: nama, alamat, koordinat, rating, jumlah penilaian, foto (`photoName`), Maps URL, tipe, ringkasan, jam buka, atribusi.

**Error:** `QUOTA_EXCEEDED` (429), `PROVIDER_UNAVAILABLE` (502/503)

---

## `GET /places/:googlePlaceId/photo`

**Actor:** public  
**Schema:** `placePhotoQuerySchema` — `name` (resource Google, sampai 2048 karakter)  
**Response:** `ApiSuccess<PlacePhotoMedia>` → `{ photoUri, attributions }`  
**Idempotency:** tidak perlu

`name` wajib milik place di path (`places/{googlePlaceId}/photos/...`). Encode query (`curl --data-urlencode`). Ambil `photoName` dari search/detail yang masih baru; referensi foto Google bisa kedaluwarsa. `photoUri` dibuka di `<img>` / browser, bukan sebagai API key.

**Error:** `INVALID_FILTER` (400), `QUOTA_EXCEEDED` (429), `PROVIDER_UNAVAILABLE` (502/503)

---

## `GET /places/:googlePlaceId/trips`

**Actor:** public  
**Schema:** `paginationQuerySchema`  
**Response:** `ApiPage<TripSummary>` — trip publik yang itinerary aktifnya mengunjungi place. Satu trip muncul sekali meski tempat itu ada di beberapa hari/stop.  
**Error:** `INVALID_FILTER` (400)

---

## `GET /places/:googlePlaceId/templates`

**Actor:** public  
**Schema:** `paginationQuerySchema`  
**Response:** `ApiPage<ItineraryTemplateSummary>` — template published yang stop-nya memakai place  
**Error:** `INVALID_FILTER` (400)

---

## `GET /templates`

**Actor:** public  
**Schema:** `templateSearchQuerySchema` — `city?`, `sort=recent\|popular` (default `popular`), `page`, `limit`  
**Response:** `ApiPage<ItineraryTemplateSummary>`  
**Error:** `INVALID_CITY` (400) untuk query tidak valid

Hanya `publicationStatus = PUBLISHED`.

---

## `GET /templates/:id`

**Actor:** public  
**Response:** `ApiSuccess<ItineraryTemplateDetail>`  
**Error:** `TEMPLATE_UNAVAILABLE` (404)

Tidak menambah `usageCount`.

Demo seed Yogyakarta: `44444444-4444-4444-8444-444444444401`.

---

## `POST /templates/:id/use`

**Actor:** login (`create_draft`)  
**Header:** `Idempotency-Key` wajib  
**Schema:** `useTemplateBodySchema`

```ts
{
  originLabel?: string;
  startDate: string;       // YYYY-MM-DD
  endDate?: string;        // default: startDate + durationDays - 1
  transportMode?: string;
  planningPartySize?: number; // default 1, 1–50
  budgetAmount?: string;   // decimal string
  budgetBasis?: "PER_PERSON" | "GROUP";
}
```

**Response:** `201 ApiSuccess<UseTemplateResult>` → `{ tripId, itineraryVersionId, trip }`

Membuat draft `PRIVATE` + itinerary `source: TEMPLATE` + `template_usages` + increment `usageCount`. Tidak menyalin chat, peserta, atau koordinat pribadi pembuat.

**Idempotency:** wajib. Retry key + body sama mengembalikan trip yang sama, tanpa usage ganda. Key sama body beda → `IDEMPOTENCY_CONFLICT` (409). Key disimpan 24 jam.

**Error:**

| Code | HTTP | Kapan |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Tanpa Bearer |
| `INVALID_PLAN_INPUT` | 400 | Body/tanggal tidak valid, atau key hilang |
| `TEMPLATE_UNAVAILABLE` | 404 | Bukan published |
| `IDEMPOTENCY_CONFLICT` | 409 | Key dipakai ulang dengan body lain |

---

## Tipe response (ringkas)

Sumber: `@dolan/shared`.

`PlaceSummary`: `googlePlaceId`, `name`, `formattedAddress`, `city`, `latitude`, `longitude`, `rating`, `userRatingCount`, `photoName`, `googleMapsUrl`, `types?`, `visitCount?`

`PlaceDetails`: `PlaceSummary` + `types`, `editorialSummary`, `weekdayDescriptions`, `attributions`, `visitCount`

`TripSummary`: `id`, `title`, `destinationCity`, `visibility`, `status`, `startDate`, `endDate`, `participantCount`, `pendingRequestCount`, `coverPlace`, `publicMeetingPointLabel`, `publicMeetingPointLatitude`, `publicMeetingPointLongitude`

`ItineraryTemplateSummary`: `id`, `title`, `city`, `durationDays`, `source`, `sourceLabel`, `usageCount`, `popularityLabel`, `coverPlace`

---

## Catatan frontend (Rusdi-D2)

- Tampilkan atribusi Google di detail/foto.
- Jangan pakai `NEXT_PUBLIC_` untuk server key; photo lewat backend `/photo`.
- Map sort UI: wisata `relevance | popular | nearest`; trip `popular | nearest | soonest` (`recent` = alias `soonest`); template `recent | popular`. Label trip: Populer, Titik mulai terdekat, Berangkat terdekat. `nearest` butuh `lat`/`lng`; jika izin lokasi ditolak, pakai `soonest` atau `popular`.
- Label popularitas hanya teks Dolan, bukan klaim “populer di Indonesia”.
- Race: request search baru harus mengabaikan response lama (PRD F01).

---

# Trip lifecycle, join, comments (WIRA-D3)

Acuan: `PRD.md` F05/F09/F10/F11, `DOLAN_TECHNICAL_KICKOFF_FINAL.md` §11, `task-assignment.md` (WIRA-D3).

Owner endpoint: **Wira**. Reviewer: **Alya**, **Salsa**. Chat REST/Socket tetap milik Alya/Salsa; D3 hanya membuat room + membership host saat publish, dan mencabut akses saat leave/cancel.

Base: `/api/v1`. Envelope sama dengan D2. Pagination default `page=1`, `limit=10`, maksimum 20.

Join **gratis**. Tidak ada field pembayaran, deposit, atau checkout.

`Idempotency-Key` wajib UUID (24 jam) pada: create, publish, join, review, comment. Retry key+body sama mengembalikan hasil semula. Key sama body beda → `IDEMPOTENCY_CONFLICT` (409). Key bukan UUID → `INVALID_PLAN_INPUT` (400).

Private yang bukan milik actor → `TRIP_NOT_FOUND` (404). Actor yang tahu resource tetapi tidak berhak → 403.

## Status

`DRAFT → OPEN | CLOSED | CANCELLED`. Public publish → `OPEN`. Private publish → `CLOSED` (tersimpan, tidak menerima join). `OPEN → CLOSED | ONGOING | CANCELLED`. `CLOSED → OPEN` (hanya public) `| ONGOING | CANCELLED`. `ONGOING → COMPLETED | CANCELLED`. Cancel tidak menghapus history; chat jadi hanya baca.

Kapasitas termasuk host. Approval memakai row lock. Pending bukan participant dan bukan member chat.

Public → private ditolak jika ada participant aktif non-host atau join pending.

## `POST /trips` (alias `POST /trips/drafts`)

**Actor:** login (`create_draft`)  
**Schema:** `createTripBodySchema`  
**Response:** `201 ApiSuccess<TripDetail>`  
**Error:** `UNAUTHENTICATED` (401), `INVALID_PLAN_INPUT` (400), `INVALID_DATE` (400), `INVALID_BUDGET` (400)

Pilihan `visibility=PUBLIC` tidak memublikasikan; status tetap `DRAFT`.

## `GET /trips/me`

**Actor:** login  
**Schema:** `myTripsQuerySchema` — `role=hosted|joined|pending` (default `hosted`), `page`, `limit`  
**Response:** `ApiPage<MyTripSummary>` (`TripSummary` + `host`, `maxParticipants`)  
Tanggal dan `destinationCity` nullable. Pending tidak masuk `joined`.  
**Error:** `INVALID_FILTER` (400)

## `GET /trips/:id`

**Actor:** public untuk trip `PUBLIC` non-draft; host/participant aktif untuk private/draft  
**Response:** `ApiSuccess<TripDetail>`  
**Error:** `TRIP_NOT_FOUND` (404)

`privateOriginLabel`, `privateOriginLatitude`, `privateOriginLongitude`, dan `preferences` hanya untuk host. `joinFree` selalu `true`. `viewerRole`: `host | participant | pending | none`.

## `PATCH /trips/:id`

**Actor:** host  
**Schema:** `updateTripBodySchema`  
Kapasitas tidak boleh turun di bawah jumlah anggota aktif. `COMPLETED`/`CANCELLED` tidak bisa diedit.  
Non-host yang bisa melihat trip → `NOT_HOST` (403). Private yang tidak diketahui → `TRIP_NOT_FOUND` (404).

## `DELETE /trips/:id`

**Actor:** host  
Hanya `DRAFT`.

## `POST /trips/:id/publish`

**Actor:** login + profil lengkap (`publish_trip`)  
**Schema:** `publishTripBodySchema`  
**Response:** `ApiSuccess<TripDetail>`

Atomik: membership host `ACTIVE` + satu `chat_rooms`. Public wajib `destinationCity`, `maxParticipants`, dan `publicMeetingPointLabel`.

**Error:** `PROFILE_INCOMPLETE` (403), `INVALID_TRANSITION` (400), `INVALID_PLAN_INPUT` (400)

## Transisi host

| Path | Dari | Ke |
|---|---|---|
| `POST /trips/:id/close` | OPEN | CLOSED |
| `POST /trips/:id/reopen` | CLOSED + PUBLIC | OPEN |
| `POST /trips/:id/start` | OPEN/CLOSED | ONGOING |
| `POST /trips/:id/complete` | ONGOING | COMPLETED |
| `POST /trips/:id/cancel` | DRAFT/OPEN/CLOSED/ONGOING | CANCELLED |

**Actor:** host + `publish_trip`. **Error:** `INVALID_TRANSITION` (400), `NOT_HOST` (403), `TRIP_NOT_FOUND` (404)

Close/reopen/start/complete/cancel menyimpan notifikasi `trip.updated` (bukan ke diri sendiri).

## `POST /trips/:id/visibility`

**Actor:** host + `publish_trip`  
**Schema:** `visibilityBodySchema`  
Private→public memakai syarat publish public. Public→private ditolak jika ada peserta/pending. Perubahan visibility menyimpan notifikasi `trip.updated` (bukan ke diri sendiri).

## `POST /trips/:id/join-requests` (alias `POST /trips/:id/join`)

**Actor:** login + profil lengkap (`join_trip`), bukan host  
**Schema:** `joinRequestBodySchema` — `message?`  
**Response:** `201 ApiSuccess<JoinRequest>`  
Hanya trip `PUBLIC` + `OPEN`. Setelah `REJECTED`/`ACCEPTED` tidak bisa ajukan ulang. `WITHDRAWN` boleh ajukan lagi pada baris yang sama.

**Error:** `TRIP_FULL` (409), `DUPLICATE_REQUEST` (409), `BLOCKED_RELATION` (403), `FORBIDDEN` (403, host), `INVALID_TRANSITION` (400)

## `GET /trips/:id/join-requests`

**Actor:** host (`approve_join`); host dicek di service  
**Schema:** `paginationQuerySchema`  
**Response:** `ApiPage<JoinRequest>`  
**Error:** `NOT_HOST` (403) jika trip diketahui, `TRIP_NOT_FOUND` (404) jika private/tidak ada

## `POST /join-requests/:id/review`

**Actor:** host (`approve_join`); host dicek di service  
**Schema:** `joinReviewBodySchema` — `{ decision: "accept" | "reject" }`  
Accept membuat membership `PARTICIPANT` `ACTIVE` tanpa pembayaran.  
**Error:** `TRIP_FULL` (409), `INVALID_TRANSITION` (400), `NOT_HOST` (403), `TRIP_NOT_FOUND` (404)

## `POST /join-requests/:id/withdraw`

**Actor:** pemohon (`join_trip`)  
Hanya status `PENDING`.

## `GET /trips/:id/comments`

**Actor:** public pada trip `PUBLIC`  
**Schema:** `paginationQuerySchema`  
**Response:** `ApiPage<TripComment>`  
**Error:** `TRIP_NOT_PUBLIC` (403) untuk private yang terlihat host

## `POST /trips/:id/comments`

**Actor:** login (`comment`) — boleh sebelum join dan saat pending  
**Header:** `Idempotency-Key` UUID wajib  
**Schema:** `createCommentBodySchema` — `body`, `parentId?`  
Reply satu tingkat. Parent harus trip yang sama. Socket `comment.created` ke room `trip:{id}:comments`.

**Error:** `INVALID_PARENT` (400), `TRIP_NOT_PUBLIC` (403)

## `PATCH /trips/:id/comments/:commentId`

**Actor:** login (`comment`), penulis  
**Schema:** `updateCommentBodySchema`

## `DELETE /trips/:id/comments/:commentId`

**Actor:** login (`comment`), penulis atau host  
Soft delete. Komentar terhapus tidak muncul di list.

## `POST /trips/:id/leave`

**Actor:** login, participant aktif (bukan host)  
Membership `LEFT`, riwayat tetap ada, chat hilang, share lokasi trip dicabut, host dinotifikasi. Host harus `cancel`.

## Tipe (ringkas)

`TripDetail`: field trip + `host`, `viewerRole`, `activeParticipantCount`, `pendingRequestCount`, `joinFree: true`, `myJoinRequest`, origin pribadi dan `preferences` (host only). Tidak ada `joinFee`.

`MyTripSummary`: `TripSummary` (`destinationCity`/`startDate`/`endDate` nullable, `participantCount`, `pendingRequestCount`, `coverPlace`, titik mulai publik) plus `host` dan `maxParticipants`.

`JoinRequest`: `id`, `tripId`, `applicant`, `message`, `status`

`TripComment`: `id`, `tripId`, `author`, `parentId`, `body`, `createdAt`

Notifikasi tersimpan (bukan milik sendiri): `join_request.created`, `join_request.reviewed`, `trip.updated`, `comment.created`, `member.left`. Event Socket.IO tetap Alya.

---

# Beranda momen (WIRA)

Owner: **Wira**. Beranda `/` = feed foto + kartu rencana. Tamu bisa melihat feed; unggah momen butuh login + profil lengkap.

`GET /home/feed` (login) menambah `stream` (`{ kind: "post" | "plan", post?, template? }`) dan `composer` (`trips`, `templates`). Rail `templates` diurut `usageCount`. Setiap 4 post, `stream` menyisipkan kartu `plan` dari template yang tidak baru tampil di 3 kartu rail.

## `GET /posts`

**Actor:** login  
**Schema:** `listPostsQuerySchema`  
**Response:** `ApiPage<PostCard>`  
Sembunyikan penulis yang di-block (dua arah).

`PostCard`: `id`, `caption`, `imageUrl`, `author`, `trip?`, `template?`, `likeCount`, `commentCount`, `likedByMe`, `comments` (3 terbaru), `createdAt`

## `POST /posts`

**Actor:** login + profil lengkap  
**Body:** `multipart/form-data` — `file` (JPG/PNG/WebP, max 5MB), `caption?`, `tripId?`, `templateId?`  
Foto ke ImageKit `/dolan/users/{id}/posts`. `tripId` hanya trip yang penulis host/peserta ACTIVE. `templateId` harus template publik.

**Error:** `PROFILE_INCOMPLETE` (403), `UPLOAD_*` (400), `TEMPLATE_UNAVAILABLE` (400), `NOT_MEMBER`/`TRIP_NOT_FOUND` (403/404)

## `DELETE /posts/:id`

Penulis atau admin. Soft delete + hapus file ImageKit.

## `POST|DELETE /posts/:id/likes`

Toggle like. Like pertama menyimpan notifikasi `post.liked` ke penulis (bukan ke diri sendiri).

## `GET|POST /posts/:id/comments`

**Schema POST:** `createPostCommentBodySchema` — `{ body }`  
Komentar baru: notifikasi `post.commented`.

## `DELETE /posts/:id/comments/:commentId`

Penulis komentar, penulis post, atau admin.

---

# Database security and release (WIRA-D4)

Owner: **Wira**. Reviewer: **Alya**. Rincian operasi: `docs/release.md`.

- IDOR: private/draft asing → `404 TRIP_NOT_FOUND`; known tetapi bukan host/member → `403`. Query chat `membership`/`role` diabaikan.
- Concurrent approve sisa 1 kursi → satu `200`, satu `409 TRIP_FULL`.
- Rate limit IP: `429 RATE_LIMITED` plus `Retry-After` (`RATE_LIMIT_MAX` / `RATE_LIMIT_SEARCH_MAX`).
- Quota Places `429 QUOTA_EXCEEDED` via `api_usage_counters.estimated_cost` (`PLACES_ESTIMATED_COST_PER_REQUEST`, placeholder).
- Leave participant memanggil evict socket room. Publish memory mengisi chat store yang sama.
- `POST /users/:userId/follow` menolak self-follow; server production memakai `SequelizeSocialStore` jika DB siap. REST sosial lengkap tetap SALSA-D4.



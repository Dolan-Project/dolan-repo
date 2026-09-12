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

Pending bukan member chat. Join tanpa pembayaran.

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

Quota Places: `PLACES_MAX_REQUESTS_PER_USER_PER_DAY` (default 50), dicatat di `api_usage_counters`.

---

## `GET /search/trips`

**Actor:** public  
**Schema:** `tripSearchQuerySchema` — `q?`, `city?`, `sort=recent\|popular`, `dateFrom?`, `dateTo?`, `page`, `limit`  
**Response:** `ApiPage<TripSummary>`  
**Idempotency:** tidak perlu

Hanya trip `PUBLIC` yang bukan `DRAFT`/`CANCELLED`. Private tidak pernah muncul.

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
**Response:** `ApiPage<TripSummary>` — trip publik yang itinerary aktifnya mengunjungi place  
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

`TripSummary`: `id`, `title`, `destinationCity`, `visibility`, `status`, `startDate`, `endDate`, `participantCount`, `pendingRequestCount`, `coverPlace`

`ItineraryTemplateSummary`: `id`, `title`, `city`, `durationDays`, `source`, `sourceLabel`, `usageCount`, `popularityLabel`, `coverPlace`

---

## Catatan frontend (Rusdi-D2)

- Tampilkan atribusi Google di detail/foto.
- Jangan pakai `NEXT_PUBLIC_` untuk server key; photo lewat backend `/photo`.
- Map sort UI: wisata `relevance | popular | nearest`; trip `recent | popular`; template `recent | popular`.
- Label popularitas hanya teks Dolan, bukan klaim “populer di Indonesia”.
- Race: request search baru harus mengabaikan response lama (PRD F01).

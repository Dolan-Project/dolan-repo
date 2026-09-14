# Generation job contract (ALYA-D2)

Saat Postgres tersedia, job memakai tabel `generation_jobs` dan menyimpan version baru di `itinerary_versions`. `trips.current_itinerary_version_id` tidak diubah sampai user memilih version (Rusdi). Snapshot version terkunci disimpan di `generation_jobs.selected_itinerary_version_id`. Persist version dan `SUCCEEDED` satu transaksi. Tanpa DB, worker memakai memory + mock Groq. Process `worker/` memakai tabel yang sama jika Postgres naik.

## REST

- `POST /api/v1/trips/:tripId/generate`
  - Actor: host draft
  - Header: `Idempotency-Key` UUID
  - Body: `{ "type": "GENERATE_ITINERARY" | "REGENERATE_ITINERARY" }`
  - 202 / 200 replay / 409 `JOB_ALREADY_ACTIVE` / 404 trip
- `GET /api/v1/generation-jobs/:jobId`

## Aturan

- Output Groq divalidasi Zod (`GROQ_API_KEY`, `GROQ_MODEL`)
- Place ID harus `ChIJ…`
- Stop terkunci dari selected version dipertahankan
- Routes mengisi `travelDurationMinutes`; gagal = catatan, bukan garis lurus
- Total budget dihitung server
- Retry max 2 untuk error sementara dengan backoff; stale PROCESSING dikembalikan ke queue
- Gagal generate tidak menghapus draft/version aktif

# Generation job contract (skeleton, ALYA-D2 siap)

Job disimpan di memory sampai Wira menyediakan tabel `generation_jobs`. `dev:server` menjalankan worker in-process agar enqueue dan process memakai store yang sama.

## REST

- `POST /api/v1/trips/:tripId/generate`
  - Actor: login, pemilik draft
  - Header: `Idempotency-Key` UUID wajib
  - Body: `{ "type": "GENERATE_ITINERARY" | "REGENERATE_ITINERARY" }`
  - 202 job baru, 200 replay key yang sama, 409 `JOB_ALREADY_ACTIVE`
- `GET /api/v1/generation-jobs/:jobId` — job tetap bisa dibaca setelah refresh

## Aturan

- AI output divalidasi Zod (`geminiItinerarySchema`)
- Tempat tanpa `googlePlaceId` ditolak
- Total budget dihitung server; angka total dari model diabaikan
- Version baru tidak menimpa `selectedVersionId`
- Gagal generate tidak menghapus draft
- Retry max 2 untuk error sementara; job `PROCESSING` stale dikembalikan ke queue

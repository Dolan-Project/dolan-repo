# Itinerary editor contract (RUSDI-D3)

Editor berada di `/trip-saya/:tripId/itinerary`. Implementasi saat ini memakai adapter mock bertipe di `dolan/features/itinerary/api.ts`, sehingga UI dapat diselesaikan sebelum endpoint itinerary tersedia. Saat wiring, pertahankan bentuk data dari `@dolan/shared` dan ganti isi adapter dengan request ke server.

## Shared schema

- `saveItineraryVersionSchema`: menyimpan perubahan sebagai version baru dari `baseVersionId`.
- `selectItineraryVersionSchema`: memilih version aktif secara eksplisit.
- `reorderStopsSchema`: mengirim urutan stop yang lengkap untuk satu hari.
- `checklistMutationSchema`: membuat atau memperbarui checklist.

Nilai uang dikirim sebagai decimal string. Client hanya menampilkan preview; subtotal dan total final wajib dihitung server. `googlePlaceId` merujuk tempat nyata yang sudah dinormalisasi. Stop custom memakai `googlePlaceId: null` dan `customTitle` yang terisi.

## Endpoint yang perlu diwiring

| Method | Path | Tujuan |
| --- | --- | --- |
| GET | `/api/v1/trips/:tripId/itinerary` | Snapshot trip, semua version, active version, dan checklist |
| POST | `/api/v1/trips/:tripId/itinerary-versions` | Validasi jadwal, hitung travel time/budget, simpan version baru |
| PATCH | `/api/v1/trips/:tripId/current-itinerary-version` | Memilih version aktif milik trip yang sama |
| POST/PATCH/DELETE | `/api/v1/trips/:tripId/checklist` | CRUD checklist milik user |
| POST | `/api/v1/trips/:tripId/generate` | Membuat generation job dengan `Idempotency-Key` |
| GET | `/api/v1/generation-jobs/:jobId` | Poll status dan mengambil `resultVersionId` |

Generation mengikuti `docs/jobs-contract.md`: hasil sukses menambah version tanpa mengganti version aktif. Stop terkunci berasal dari snapshot version terpilih. Retry memakai idempotency key yang sama agar tidak membuat version ganda. Kegagalan provider tidak boleh menghapus draft, version aktif, atau perubahan editor yang belum dikirim.

## Validasi

- Waktu mulai stop berikutnya harus sama atau lebih besar dari waktu selesai stop sebelumnya ditambah `travelDurationMinutes`.
- Urutan stop unik dan berurutan mulai dari 1 pada setiap hari.
- Tempat terkunci dipertahankan dalam hasil generate.
- `unitCostHigh >= unitCostLow`; quantity dan biaya tidak negatif.
- Version yang dipilih dan `baseVersionId` harus berasal dari trip yang sama.

# Location privacy (ALYA-D4, cicilan 1)

Berbagi lokasi **opt-in**. Pending tidak melihat lokasi presisi.

## Aturan

- Durasi: `ONE_HOUR` atau `UNTIL_TRIP_END`
- Stale setelah 2 menit tanpa ping
- Disembunyikan setelah 10 menit
- `PUBLIC_APPROXIMATE` dikuantisasi ~1 km (2 desimal)
- Revoke/expiry menghapus titik terakhir dari response
- Event: `location.updated`, `location.stopped` ke member aktif

## REST

- `POST /api/v1/trips/:tripId/location/start`
- `POST /api/v1/trips/:tripId/location/ping`
- `POST /api/v1/trips/:tripId/location/stop`
- `GET /api/v1/trips/:tripId/locations`

Belum di cicilan ini: PDF, Maps URL, share link token hash.

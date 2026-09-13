# Location, share, PDF (ALYA-D4)

Berbagi lokasi **opt-in**. Pending tidak melihat lokasi presisi. Token share hanya muncul sekali; yang disimpan adalah hash.

## Lokasi

- Durasi: `ONE_HOUR` atau `UNTIL_TRIP_END`
- Stale: `LOCATION_STALE_SECONDS` (default 120)
- Hide: `LOCATION_HIDE_SECONDS` (default 600)
- `PUBLIC_APPROXIMATE` / viewer publik: kuantisasi ~1 km (2 desimal)
- Revoke/expiry menghapus titik terakhir dari response
- Persist: `location_shares`, `location_latest`
- Event: `location.updated`, `location.stopped` ke member aktif

## Share link

- Token raw hanya di `POST` create
- `token_hash` = sha256(`SHARE_TOKEN_SECRET:token`)
- Preview hanya field yang diizinkan: title, destinationCity, dates, summary
- Dilarang: `privateOrigin*`, email, koordinat presisi, hash token
- Revoke oleh member aktif trip

## PDF & Maps

- PDF memakai versi terpilih (`trips.current_itinerary_version_id`) atau `?versionId=`
- Navigation: Google Maps Directions URL dari stop versi terpilih

## REST

- `POST /api/v1/trips/:tripId/location/start`
- `POST /api/v1/trips/:tripId/location/ping`
- `POST /api/v1/trips/:tripId/location/stop`
- `GET /api/v1/trips/:tripId/locations`
- `GET /api/v1/trips/:tripId/itinerary.pdf?versionId=`
- `GET /api/v1/trips/:tripId/navigation?day=&versionId=`
- `POST /api/v1/trips/:tripId/share-links`
- `POST /api/v1/trips/:tripId/share-links/:linkId/revoke`
- `GET /api/v1/share/:token` (publik)

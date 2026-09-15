# Chat and notifications (ALYA-D3)

Pending join **tidak** membaca chat (REST atau Socket.IO). Hanya member `ACTIVE`. Trip `CANCELLED` membuat room read-only.

## REST

- `GET /api/v1/trips/:tripId/messages?after=&before=&limit=`
- `POST /api/v1/trips/:tripId/messages` body `{ clientMessageId, body }`
- `POST /api/v1/trips/:tripId/messages/read` body `{ lastReadMessageId }`
- `POST /api/v1/trips/:tripId/chat/leave` evict socket dari room
- `GET /api/v1/notifications` → `data[]` plus `unreadCount`; each item includes `title`, `body`, `href`, `tripId`
- `POST /api/v1/notifications/:id/read`

## Socket.IO (cookie handshake)

- `room.join` `{ tripId }` → join `trip:{tripId}` (hanya member `ACTIVE`)
- `comments.join` `{ tripId }` → join `trip:{tripId}:comments` (trip `PUBLIC` yang terlihat)
- `message.send` persist dulu, lalu `message.created` ke room chat dan member aktif
- `message.read` `{ tripId, lastReadMessageId }`
- Server ke user: `notification.created` (salinan inbox dengan `title`/`body`/`href`/`tripId`)
- Server ke member aktif: `trip.updated`, `join_request.created`, `join_request.reviewed`, `generation.updated`
- Server ke pemohon join: `join_request.reviewed` (langsung ke socket user, karena pending member belum boleh `room.join`)
- Server ke room komentar: `comment.created`, `comment.updated`, `comment.deleted`, `join_request.created`, `join_request.reviewed` (halaman trip live tanpa refresh)
- `POST /trips/:id/chat/leave` menandai membership LEFT dan evict socket

Reconnect: `GET messages?after=<lastId>`. Duplikat dicegah unique `(sender, clientMessageId)`.

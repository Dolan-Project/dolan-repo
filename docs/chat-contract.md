# Chat and notifications (ALYA-D3)

Pending join **tidak** membaca chat (REST atau Socket.IO). Hanya member `ACTIVE`. Trip `CANCELLED` membuat room read-only.

## REST

- `GET /api/v1/trips/:tripId/messages?after=&before=&limit=`
- `POST /api/v1/trips/:tripId/messages` body `{ clientMessageId, body }`
- `POST /api/v1/trips/:tripId/messages/read` body `{ lastReadMessageId }`
- `POST /api/v1/trips/:tripId/chat/leave` evict socket dari room
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/:id/read`

## Socket.IO (cookie handshake)

- `room.join` `{ tripId }` → join `trip:{tripId}` (hanya member `ACTIVE`)
- `comments.join` `{ tripId }` → join `trip:{tripId}:comments` (trip `PUBLIC` yang terlihat)
- `message.send` persist dulu, lalu `message.created` ke room chat dan member aktif
- `message.read` `{ tripId, lastReadMessageId }`
- Server ke member aktif: `notification.created`, `trip.updated`, `join_request.created`, `join_request.reviewed`, `generation.updated`
- Server ke room komentar: `comment.created`, `comment.updated`, `comment.deleted`
- `POST /trips/:id/chat/leave` menandai membership LEFT dan evict socket

Reconnect: `GET messages?after=<lastId>`. Duplikat dicegah unique `(sender, clientMessageId)`.

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

- `room.join` `{ tripId }` → join `trip:{tripId}`
- `message.send` persist dulu, lalu `message.created`
- `message.read` update read state
- Server: `notification.created` ke penerima, bukan actor

Reconnect: `GET messages?after=<lastId>`. Duplikat dicegah unique `(sender, clientMessageId)`.

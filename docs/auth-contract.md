# Auth contract (ALYA-D1)

Express tidak punya login/password. Next.js (Salsa) memanggil Supabase Auth, lalu meneruskan access token ke API.

## REST

Base: `/api/v1`

- `GET /auth/session` — Bearer wajib. Response `ApiSuccess<SessionResponse>` (termasuk email untuk BFF, bukan halaman publik).
- `GET /users/me` — Bearer wajib. Response `{ user: PublicUser, emailVerified, profileComplete }` agar Salsa bisa ganti mock. Email tidak dikirim.
- `POST /auth/disconnect-sockets` — Bearer wajib. Memutus seluruh socket user itu.
- `POST /auth/uploads/profile` — Bearer wajib. Body: `{ ownerUserId, mimeType, byteSize, kind: "avatar" | "cover" }`.

User store: `MemoryUserRepository` untuk tes/mock. Saat API start dan Postgres Wira tersambung, Express memakai `SequelizeUserRepository` (upsert `users.auth_reference`, baca `user_profiles`). `role`/`status` tidak di-update dari token.

Guards:

| Aksi | Syarat |
|---|---|
| Baca public | Guest boleh |
| Buat draft | Login |
| Publish / join | Login + email verified + profil lengkap (`username`, `displayName`, `domicile`) |
| Komentar / follow | Login + email verified |
| Chat | Host atau participant `ACTIVE` saja. Pending ditolak `PENDING_MEMBER` |
| Upload avatar/cover | Login dan `ownerUserId` = actor |

`role` dan `status` tidak diterima dari client. Token tidak dikembalikan di body dan tidak ditulis ke log.

Token mock development: `mock-verified-complete`, `mock-unverified`, `mock-incomplete-profile`, `mock-admin`.

Generate itinerary: lihat `docs/jobs-contract.md`.

## Socket.IO

- Path: `/socket.io`
- `withCredentials: true`
- Handshake membaca cookie Supabase (`sb-*-auth-token`), mengambil `access_token`, memvalidasi ke adapter.
- Client tidak mengirim `auth.accessToken`.

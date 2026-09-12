git sttaus# API Contract (draf)

Bagian ini dikunci Salsa pada TEAM-D1. Search, session Express, dan migration bukan milik bagian ini.

## Next.js auth

| Method | Path                        |
| ------ | --------------------------- |
| POST   | `/api/auth/register`        |
| POST   | `/api/auth/login`           |
| POST   | `/api/auth/logout`          |
| GET    | `/api/auth/callback`        |
| POST   | `/api/auth/forgot-password` |
| POST   | `/api/auth/reset-password`  |

Response login/register: `ApiSuccess<AuthSession>`. `AuthSession` = `{ user: PublicUser, emailVerified, profileComplete }`. Password/token tidak dikembalikan.

Return-to-action: query/body `next`; invalid → `/`. Tidak auto-submit join/publish/komentar.

## Express `/api/v1` (Salsa domain)

| Method    | Path                          |
| --------- | ----------------------------- |
| GET/PATCH | `/users/me`                   |
| GET       | `/users/:username`            |
| POST      | `/users/me/avatar`            |
| POST      | `/users/me/cover`             |
| POST      | `/trips`                      |
| GET       | `/trips/me`                   |
| GET       | `/trips/:id`                  |
| POST      | `/trips/:id/publish`          |
| POST      | `/trips/:id/join-requests`    |
| POST      | `/join-requests/:id/review`   |
| POST      | `/join-requests/:id/withdraw` |
| GET/POST  | `/trips/:id/comments`         |
| GET/POST  | `/trips/:id/messages`         |

Pending bukan member chat. Join tanpa pembayaran.

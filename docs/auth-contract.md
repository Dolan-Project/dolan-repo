# Auth contract (Express local + Google OAuth)

Semua autentikasi dijalankan di **Express**. Next.js hanya BFF/proxy cookie `dolan_session`. **Supabase Auth tidak dipakai.**

## Mode

| `AUTH_ADAPTER` | Kegunaan |
|---|---|
| `local` (default) | Password + Google OAuth + `auth_sessions` di Postgres (atau memory tanpa DB) |
| `mock` | Token `mock-*` untuk unit test API |

## REST

Base: `/api/v1`

| Method | Path | Keterangan |
|---|---|---|
| POST | `/auth/register` | Email + password (scrypt) → session; kirim email verifikasi (belum verified) |
| POST | `/auth/login` | Email + password → session token |
| POST | `/auth/logout` | Revoke session |
| POST | `/auth/forgot-password` | Buat reset token + kirim email (dev tanpa provider: `debugResetToken`) |
| POST | `/auth/reset-password` | Set password baru |
| POST | `/auth/verify-email` | Consume token verifikasi → set `email_verified_at` |
| POST | `/auth/resend-verification` | Bearer wajib; kirim ulang email verifikasi |
| GET | `/auth/google` | Redirect ke Google OAuth (`?next=/jelajah`) |
| GET | `/auth/google/callback` | Tukar `code`, buat/link user, redirect ke Next `/api/auth/callback?token=…` |
| GET | `/auth/session` | Bearer wajib |
| GET | `/users/me` | Bearer wajib |
| POST | `/auth/disconnect-sockets` | Bearer wajib |
| POST | `/auth/uploads/profile` | Meta upload |
| POST | `/auth/uploads/profile/:kind` | Binary avatar/cover |

Cookie browser: `dolan_session` (HttpOnly). Socket.IO hanya membaca cookie itu.

## Google OAuth (tanpa Supabase)

Env Express:

```bash
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:4000/api/v1/auth/google/callback
WEB_URL=http://localhost:3000
```

Di Google Cloud Console, daftarkan redirect URI yang sama. Alur UI: tombol **Akun Google** → Next `/api/auth/google` → Express → Google → Express callback → Next `/api/auth/callback` set cookie.

User baru: `auth_reference = google:{sub}`. Jika email sudah ada (akun password), Google login **mengaitkan ke akun yang sama** tanpa mengubah `auth_reference`.

## Email (Resend)

```bash
EMAIL_PROVIDER_API_KEY=re_...
EMAIL_FROM=noreply@your-verified-domain.com
WEB_URL=http://localhost:3000
```

Register mengirim tautan ke `{WEB_URL}/api/auth/verify-email?token=…`. Forgot password mengirim `{WEB_URL}/reset-password?token=…`. Domain pengirim harus terverifikasi di Resend.

## Guards

| Aksi | Syarat |
|---|---|
| Baca public | Guest boleh |
| Buat draft | Login |
| Publish / join | Login + email verified + profil lengkap |
| Komentar / follow | Login + email verified |
| Chat | Host atau participant `ACTIVE` |
| Upload avatar/cover | Login dan `ownerUserId` = actor |

`role` / `status` tidak diterima dari client.

Token mock development: `mock-verified-complete`, `mock-unverified`, `mock-incomplete-profile`, `mock-admin`, `mock-verified-budi`.

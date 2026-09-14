# Final Task Distribution — Dolan Sprint 4 Hari

**Status:** Siap digunakan  
**Durasi:** 4 hari  
**Tim:** Rusdi, Wira, Alya, Salsa  
**Development mulai:** Hari 1 pukul 10.00  
**Acuan produk:** `PRD.md`  
**Acuan teknis:** `DOLAN_TECHNICAL_KICKOFF_FINAL.md`

---

# 1. Aturan Eksekusi

## Prioritas

| Prioritas | Arti |
|---|---|
| P0 | Wajib selesai dan berjalan end-to-end |
| P1 | Dikerjakan setelah seluruh P0 stabil |
| P2 | Penyempurnaan visual, aksesibilitas, dan performa |

## Jadwal Harian

| Waktu | Kegiatan |
|---|---|
| 08.00–10.00 | Technical kickoff dan kontrak bersama |
| 10.00 | Development task individu dimulai |
| 12.00 | Sinkronisasi kontrak dan merge pertama |
| 17.00 | Integrasi staging dan demo internal |

## Aturan Tim

- `TEAM-D1` hanya mengunci arsitektur dan kontrak, bukan menyelesaikan semua migration.
- Seluruh anggota mulai development pukul 10.00.
- Frontend menggunakan typed mock selama API belum selesai.
- Bentuk typed mock harus sama dengan response API final.
- Perubahan shared contract harus direview minimal satu frontend dan satu backend.
- Wira menjadi satu-satunya merger migration.
- Rusdi dan Salsa saling review frontend.
- Wira dan Alya saling review backend.
- Hari 3 pukul 17.00 menjadi feature freeze P0.
- Hari 4 pukul 12.00 menjadi feature freeze seluruh fitur.
- Setelah feature freeze, hanya bug, security, testing, dan deployment.
- Flow produk tidak boleh berbeda dari `PRD.md`.

---

# 2. Judul Task untuk Kanban

## Team

1. `TEAM-D1 — Lock Architecture and P0 Contracts`

## Rusdi

1. `RUSDI-D1 — Homepage, Design System, and Typed Search Client`
2. `RUSDI-D2 — Explore Map, Place Detail, and Popular Results`
3. `RUSDI-D3 — Itinerary Editor, Checklist, and Budget`
4. `RUSDI-D4 — Planning Flow Integration and Accessibility`

## Wira

1. `WIRA-D1 — Complete Sequelize Database Baseline`
2. `WIRA-D2 — Google Search and Popularity APIs`
3. `WIRA-D3 — Trip Lifecycle, Membership, Join, and Comments`
4. `WIRA-D4 — Database Security and Release`

## Alya

1. `ALYA-D1 — Supabase Session and Authorization Foundation`
2. `ALYA-D2 — AI Worker, Routing, Versions, and Budget`
3. `ALYA-D3 — Socket.IO Chat and Stored Notifications`
4. `ALYA-D4 — Location, PDF, Share Links, and Privacy`

## Salsa

1. `SALSA-D1 — Auth Routes and Profile Fullstack Experience`
2. `SALSA-D2 — Create Trip, My Trip, and Trip Detail`
3. `SALSA-D3 — Join, Comments, Approval, Chat, and Notifications`
4. `SALSA-D4 — Social APIs, Social UI, Moderation, and PWA`

---

# 3. Technical Kickoff

## `TEAM-D1 — Lock Architecture and P0 Contracts`

**Hari:** 1  
**Waktu:** 08.00–10.00  
**Prioritas:** P0  
**PIC:** seluruh anggota

## Tujuan

Mengunci kontrak teknis agar semua anggota dapat mulai development pukul 10.00 tanpa menunggu implementasi anggota lain.

## Wira

- Menentukan konfigurasi Sequelize dan Sequelize CLI.
- Menentukan naming convention database.
- Menentukan urutan migration.
- Membuat database connection skeleton.
- Mengunci daftar tabel, relasi, constraint, dan index.

## Alya

- Mengunci alur Supabase Auth.
- Mengunci validasi session pada Express.
- Mengunci authorization guest, user, host, participant, pending, dan admin.
- Mengunci Socket.IO authentication menggunakan cookie.
- Mengunci format error authorization.

## Rusdi

- Mengunci shared response types.
- Mengunci kontrak search.
- Mengunci API client interface.
- Mengunci struktur design system.
- Mengunci loading, empty, error, dan unauthorized state.

## Salsa

- Mengunci Next.js auth route contract.
- Membuat struktur typed mock.
- Mengunci kontrak profile, trip, join, dan chat.
- Mengunci return-to-action setelah login.

## Output Pukul 10.00

- Struktur folder telah disepakati.
- Ownership file telah ditentukan.
- Shared types dan Zod schema memiliki lokasi yang jelas.
- Kontrak P0 search, template, trip, join, dan chat tersedia.
- Database connection dan migration runner memiliki skeleton.
- Typed mock dapat digunakan frontend.
- Semua anggota dapat mulai development.

## Yang Tidak Wajib Selesai Pukul 10.00

- Seluruh migration database.
- Seluruh model Sequelize.
- Auth implementation lengkap.
- API endpoint lengkap.
- UI halaman lengkap.

---

# 4. Pembagian Tugas Rusdi

## `RUSDI-D1 — Homepage, Design System, and Typed Search Client`

**Hari:** 1, mulai pukul 10.00  
**Prioritas:** P0  
**Reviewer:** Salsa untuk UI, Wira untuk kontrak

## Tugas Frontend

- Membuat design tokens.
- Membuat navigation utama.
- Membuat homepage hero.
- Membuat input kota dan tanggal.
- Membuat modal hasil pencarian.
- Membuat `PlaceCard`.
- Membuat `TripCard`.
- Membuat `ItineraryTemplateCard`.
- Membuat loading, empty, error, dan reduced-motion state.
- Mencegah response search lama menimpa response terbaru.

## Tugas Fullstack

- Membuat shared types untuk city dan place search.
- Membuat Zod schema untuk search query.
- Membuat API client.
- Membuat mock adapter dan real API adapter dengan interface yang sama.

## Target Pukul 17.00

Homepage dapat melakukan search menggunakan typed mock.

## Acceptance Criteria

- Search mendukung tujuan dan tanggal.
- Loading berhenti saat berhasil atau gagal.
- Error dan empty state tersedia.
- Response lama tidak menimpa response terbaru.
- Komponen card dapat digunakan kembali pada Explore.

---

## `RUSDI-D2 — Explore Map, Place Detail, and Popular Results`

**Hari:** 2  
**Prioritas:** P0  
**Dependency:** typed mock; integrasi API dengan `WIRA-D2`  
**Reviewer:** Wira

## Tugas

- Membuat tab Wisata, Trip, dan Template.
- Membuat desktop list-map.
- Membuat mobile map dengan bottom sheet.
- Membuat posisi collapsed, half, dan expanded.
- Menyinkronkan marker dan card.
- Membuat pagination.
- Membuat filter dan sort.
- Membuat tombol “Cari di area ini”.
- Membuat detail wisata.
- Menampilkan atribusi Google.
- Menampilkan trip dan template terkait.
- Mengintegrasikan tiga jenis popularitas.

## Target Pukul 17.00

Explore menampilkan Places, public trip, template kurasi, dan template populer.

## Acceptance Criteria

- Private trip tidak muncul.
- Marker dan card tersinkronisasi.
- Penolakan GPS tidak memblokir search.
- Template tanpa penggunaan tidak disebut populer.
- Rating Google dibedakan dari rating user.
- Informasi yang tidak tersedia memiliki empty state.

---

## `RUSDI-D3 — Itinerary Editor, Checklist, and Budget`

**Hari:** 3  
**Prioritas:** P0  
**Dependency:** typed generation mock; integrasi dengan `ALYA-D2`  
**Reviewer:** Alya

## Tugas

- Membuat editor itinerary day.
- Membuat editor itinerary stop.
- Membuat tambah dan hapus tempat.
- Membuat reorder.
- Membuat edit waktu dan durasi.
- Membuat edit catatan.
- Membuat lock dan unlock tempat.
- Membuat checklist.
- Membuat budget editor.
- Membuat itinerary version selector.
- Membuat generation-job status.
- Membuat mutation schema bersama Alya.

## Target Pukul 17.00

Itinerary dapat diedit dan disimpan sebagai version baru.

## Acceptance Criteria

- Jadwal tidak tumpang tindih.
- Waktu perjalanan dihitung.
- Tempat yang dikunci dipertahankan.
- Version aktif tidak hilang.
- Budget dihitung backend.
- Gagal generate tidak menghapus draft.
- Retry tidak membuat version ganda.

---

## `RUSDI-D4 — Planning Flow Integration and Accessibility`

**Hari:** 4  
**Prioritas:** P0/P2  
**Reviewer:** Salsa dan Wira

## Tugas

- Mengintegrasikan search → detail.
- Mengintegrasikan detail → pakai itinerary.
- Mengintegrasikan template → draft.
- Mengintegrasikan draft → editor.
- Mengintegrasikan editor → save atau publish.
- Menguji provider failure.
- Menguji response race.
- Memperbaiki keyboard navigation.
- Memeriksa touch target.
- Memeriksa mobile layout.
- Memeriksa reduced motion.
- Menyelesaikan bug frontend P0.

## Target Pukul 12.00

Flow perencanaan berjalan end-to-end pada mobile dan desktop.

---

# 5. Pembagian Tugas Wira

## `WIRA-D1 — Complete Sequelize Database Baseline`

**Hari:** 1, mulai pukul 10.00  
**Prioritas:** P0  
**Reviewer:** Alya

## Tugas

Membuat migration, model, association, constraint, dan index untuk:

- `users`
- `user_profiles`
- `places`
- `itinerary_templates`
- `template_days`
- `template_stops`
- `template_usages`
- `trips`
- `trip_members`
- `trip_join_requests`
- `itinerary_versions`
- `itinerary_days`
- `itinerary_stops`
- `budget_items`
- `trip_checklist_items`
- `trip_comments`
- `chat_rooms`
- `messages`
- `message_read_states`
- `notifications`
- `push_subscriptions`
- `user_follows`
- `user_reviews`
- `location_shares`
- `location_latest`
- `user_blocks`
- `reports`
- `moderation_actions`
- `generation_jobs`
- `trip_share_links`
- `api_usage_counters`
- `idempotency_keys`

## Seeder

- Kota tujuan demo.
- Google Place ID yang sudah diverifikasi.
- Template itinerary kurasi.
- Template day dan stop.
- Akun development jika diperlukan.

## Target Pukul 12.00

Tabel yang diperlukan untuk P0 tersedia:

- Users dan profiles.
- Places dan templates.
- Trips dan memberships.
- Itinerary dan budget.
- Join requests.
- Chat rooms dan messages.

## Target Pukul 17.00

Seluruh migration, model, association, constraint, index, dan seeder selesai.

## Acceptance Criteria

- Migration `up` berhasil pada database kosong.
- Migration `down` tersedia.
- Foreign key dan unique constraint dibuat di database.
- Index search, chat, notification, dan job tersedia.
- Seeder tidak mengarang popularitas.
- Tidak menggunakan `sequelize.sync({ alter: true })`.
- Migration yang sudah dibagikan tidak diedit.

---

## `WIRA-D2 — Google Search and Popularity APIs`

**Hari:** 2  
**Prioritas:** P0  
**Dependency:** `WIRA-D1` dan kontrak Rusdi  
**Reviewer:** Rusdi dan Alya

## Tugas

- Mengintegrasikan Google Places Text Search.
- Mengintegrasikan Place Details.
- Mengintegrasikan Place Photos.
- Menggunakan field mask secukupnya.
- Membuat public trip search.
- Membuat template search berdasarkan kota.
- Membuat popularitas destinasi.
- Membuat popularitas trip.
- Membuat popularitas template.
- Membuat template-use transaction.
- Menyalin template menjadi draft.
- Membuat `template_usages`.
- Memperbarui `usage_count`.
- Menangani idempotency.
- Menangani quota dan provider error.
- Mencatat API usage.

## Definisi Popularitas

1. Destinasi populer dihitung dari public trip aktif yang mengunjungi tempat.
2. Trip populer dihitung dari participant aktif, kemudian pending request sebagai tie-breaker.
3. Template populer dihitung dari template yang berhasil disalin menjadi draft.

## Acceptance Criteria

- Melihat template tidak menambah penggunaan.
- Retry tidak membuat draft atau usage ganda.
- Template seed berlabel “Kurasi Dolan”.
- Label “Populer di Dolan” hanya muncul jika ada penggunaan nyata.
- Private trip tidak muncul dalam search.

---

## `WIRA-D3 — Trip Lifecycle, Membership, Join, and Comments`

**Hari:** 3  
**Prioritas:** P0  
**Dependency:** `WIRA-D1` dan `ALYA-D1`  
**Reviewer:** Alya dan Salsa

## Tugas

- Membuat draft CRUD.
- Membuat publish.
- Membuat close dan reopen.
- Membuat start dan complete.
- Membuat cancel.
- Membuat visibility change.
- Membuat host membership dan chat room secara atomik.
- Membuat join request.
- Membuat withdraw.
- Membuat accept dan reject.
- Membuat capacity transaction dan row locking.
- Membuat komentar dan satu tingkat reply.
- Membuat leave-trip.
- Membuat block checks.
- Membuat notification trigger.

## Acceptance Criteria

- Host tidak dapat join trip sendiri.
- Join request tidak dapat diduplikasi.
- Pending tidak dianggap participant.
- Approval tidak melewati kapasitas.
- Public → private ditolak jika masih memiliki participant atau pending.
- Cancel tidak menghapus history.
- Participant yang keluar kehilangan chat dan location.
- Join tidak memiliki pembayaran.

---

## `WIRA-D4 — Database Security and Release`

**Hari:** 4  
**Prioritas:** P0/P1  
**Reviewer:** Alya

## Tugas

- Menjalankan IDOR test.
- Menjalankan concurrent approval test.
- Memeriksa index dan query.
- Membuat rate limit.
- Memeriksa API usage counter.
- Menjalankan migration staging.
- Menyiapkan backup.
- Menyiapkan rollback procedure.
- Membantu query sosial Salsa.
- Menyelesaikan blocker backend P0.

## Target Pukul 12.00

Database dan API P0 siap untuk final regression.

---

# 6. Pembagian Tugas Alya

## `ALYA-D1 — Supabase Session and Authorization Foundation`

**Hari:** 1, mulai pukul 10.00  
**Prioritas:** P0  
**Dependency:** migration users Wira tersedia pukul 12.00  
**Reviewer:** Wira dan Salsa

## Pukul 10.00–12.00

- Membuat Supabase adapter.
- Membuat middleware interface.
- Membuat authorization rules.
- Membuat auth mock dan unit test tanpa database.

## Pukul 12.00–17.00

- Mengintegrasikan tabel users dan profiles.
- Membuat user upsert.
- Membuat login guard.
- Membuat verified-email guard.
- Membuat profile-complete guard.
- Membuat host, participant, dan admin guard.
- Membuat Socket.IO cookie authentication.
- Membuat logout socket disconnection.
- Membuat upload authorization.

## Acceptance Criteria

- Guest dapat membaca fitur public.
- Login diperlukan untuk membuat draft.
- Verified email diperlukan untuk publish, join, komentar, dan follow.
- Profil lengkap diperlukan untuk publish dan join.
- Pending tidak memperoleh chat.
- Token tidak masuk log atau response.
- Token tidak disimpan di `localStorage`.

---

## `ALYA-D2 — AI Worker, Routing, Versions, and Budget`

**Hari:** 2  
**Prioritas:** P0  
**Dependency:** migration itinerary/job Wira dan kontrak editor Rusdi  
**Reviewer:** Wira dan Rusdi

## Tugas

- Membuat generation-job polling.
- Membuat row-lock job claim.
- Mengintegrasikan Groq structured output.
- Memvalidasi output dengan Zod.
- Memvalidasi kandidat tempat nyata.
- Mengintegrasikan Google Routes.
- Membuat retry dan timeout.
- Membuat stale-job recovery.
- Menyimpan itinerary version baru.
- Mempertahankan version aktif.
- Menghitung budget di backend.
- Menangani rute yang tidak didukung.

## Acceptance Criteria

- Job dapat dibaca setelah refresh.
- Retry tidak membuat version ganda.
- AI tidak membuat tempat palsu.
- AI tidak menghitung total akhir.
- Tempat terkunci dipertahankan.
- Gagal generate tidak menghapus draft.
- Rute yang tidak tersedia dijelaskan.

---

## `ALYA-D3 — Socket.IO Chat and Stored Notifications`

**Hari:** 3  
**Prioritas:** P0  
**Dependency:** membership contract tersedia; integrasi dengan `WIRA-D3`  
**Reviewer:** Wira dan Salsa

## Tugas

- Membuat authorized room.
- Menyimpan message sebelum broadcast.
- Membuat deduplication menggunakan `clientMessageId`.
- Membuat pagination.
- Membuat read state.
- Membuat reconnect handling.
- Membuat cancelled room read-only.
- Menyimpan notification.
- Membuat notification event.
- Menghapus room access saat participant keluar.
- Mencegah notification untuk aktivitas sendiri.

## Acceptance Criteria

- Pending tidak membaca chat melalui REST atau Socket.IO.
- Accepted participant dapat masuk room.
- Reconnect mengambil pesan tertinggal.
- Message tidak terduplikasi.
- Participant yang keluar tidak menerima event.
- Notification lama dapat dibaca tanpa socket.

---

## `ALYA-D4 — Location, PDF, Share Links, and Privacy`

**Hari:** 4  
**Prioritas:** P1  
**Dependency:** selected version Rusdi dan permission Wira  
**Reviewer:** Salsa dan Wira

## Tugas

- Membuat location sharing opt-in.
- Membuat pilihan satu jam atau sampai trip selesai.
- Menandai stale setelah dua menit.
- Menyembunyikan location setelah sepuluh menit.
- Menghentikan sharing saat revoke atau expiry.
- Membuat public approximation sekitar satu kilometer.
- Membuat PDF selected itinerary version.
- Membuat Google Maps navigation URL.
- Membuat limited private share link.
- Menyimpan token sebagai hash.
- Membuat preview dan revoke link.
- Menjalankan privacy regression.

## Target Pukul 12.00

Location, PDF, dan sharing minimum terintegrasi tanpa membuka data private.

---

# 7. Pembagian Tugas Salsa

## `SALSA-D1 — Auth Routes and Profile Fullstack Experience`

**Hari:** 1, mulai pukul 10.00  
**Prioritas:** P0  
**Dependency:** kontrak auth dari `TEAM-D1`  
**Reviewer:** Alya dan Rusdi

## Tugas

- Membuat Next.js register handler.
- Membuat login dan logout.
- Membuat verification callback.
- Membuat forgot/reset password.
- Membuat auth screens.
- Membuat profile form.
- Membuat avatar dan cover upload.
- Membuat return-to-action.
- Membuat profile Zod schema.
- Membuat typed auth/profile mock.

## Acceptance Criteria

- Salsa tidak menunggu seluruh `ALYA-D1`.
- Typed mock digunakan sampai session middleware tersedia.
- Duplicate username dan email ditangani.
- Password dan token tidak dikembalikan.
- Email tidak muncul pada profil public.
- Pemilik melihat Edit Profil.
- User lain melihat Follow.
- Upload memiliki validasi.

---

## `SALSA-D2 — Create Trip, My Trip, and Trip Detail`

**Hari:** 2  
**Prioritas:** P0  
**Dependency:** typed mock; integrasi API dengan `WIRA-D3`  
**Reviewer:** Wira dan Rusdi

## Tugas

- Membuat form trip sesuai F05.
- Membuat tujuan langsung dan Bantu AI.
- Membuat private/public state.
- Membuat publish confirmation.
- Membuat My Trip: Dibuat.
- Membuat My Trip: Diikuti.
- Membuat My Trip: Pengajuan.
- Membuat detail berdasarkan role.
- Membuat lifecycle action.
- Membuat leave-trip action.
- Membuat Zod schema create/update trip.

## Acceptance Criteria

- Tanggal, budget, dan jumlah orang tervalidasi.
- Tujuan kosong hanya pada jalur AI.
- Private origin tidak otomatis menjadi meeting point.
- Planning party size berbeda dari capacity.
- Draft tidak otomatis public.
- Double click tidak membuat trip ganda.
- Pending tidak dianggap participant.

---

## `SALSA-D3 — Join, Comments, Approval, Chat, and Notifications`

**Hari:** 3  
**Prioritas:** P0  
**Dependency:** kontrak `TEAM-D1`; integrasi `WIRA-D3` dan `ALYA-D3`  
**Reviewer:** Wira dan Alya

## Tugas

- Membuat komentar public.
- Membuat reply satu tingkat.
- Membuat ajukan dan withdraw join.
- Membuat approval/rejection panel.
- Menampilkan profil pemohon.
- Menampilkan label join gratis.
- Membuat chat UI.
- Membuat reconnect state.
- Membuat unread indicator.
- Membuat notification center.
- Menangani unauthorized dan pending state.

## Acceptance Criteria

- Visitor dapat membaca komentar.
- Menulis komentar membutuhkan verified user.
- Pending dapat berkomentar.
- Pending tidak dapat membaca chat.
- Tombol menggunakan “Ajukan join”.
- Tidak ada booking, checkout, deposit, atau pembayaran.
- Keputusan host terlihat oleh pemohon.

---

## `SALSA-D4 — Social APIs, Social UI, Moderation, and PWA`

**Hari:** 4  
**Prioritas:** P1  
**Dependency:** migration sosial selesai Hari 1  
**Reviewer:** Alya untuk authorization, Wira untuk Sequelize query

## Tugas

Frontend dan backend untuk:

- Follow dan unfollow.
- Followers dan following.
- Attendance confirmation.
- Review antaruser.
- Rating dan history profil.
- Block dan unblock.
- Create report.
- Admin list/review report.
- Moderation action minimum.
- Service worker.
- PWA manifest.
- Explicit offline itinerary.
- Logout private-cache cleanup.

## Acceptance Criteria

- Self-follow ditolak.
- Self-review ditolak.
- Duplicate review ditolak.
- Review hanya untuk participant trip selesai.
- Block menghapus follow dan mencegah follow/join.
- Public history hanya menampilkan data yang diizinkan.
- Offline hanya menyimpan itinerary pilihan user.
- Logout membersihkan data private offline.

---

# 8. Milestone Harian

## Akhir Hari 1 — Foundation Ready

- Technical kickoff selesai pukul 10.00.
- Development dimulai pukul 10.00.
- Tabel P0 tersedia pukul 12.00.
- Seluruh migration dan seeder selesai pukul 17.00.
- Auth dan Socket.IO foundation bekerja.
- Shared types dan typed mocks tersedia.
- Homepage dan auth/profile dasar dapat dicoba.

## Akhir Hari 2 — Planning Foundation Ready

- Google Places search dan detail bekerja.
- Public trip dan template search bekerja.
- Ketiga jenis popularitas bekerja.
- Template dapat disalin tanpa duplikasi.
- Create Trip dan My Trip tersedia.
- AI job dan routing memiliki implementasi dasar.
- Explore dan detail wisata dapat dicoba.

## Akhir Hari 3 — P0 End-to-End

- Search → template/trip → draft → itinerary → publish berjalan.
- Comment → join → approve → chat berjalan.
- Private trip tidak bocor.
- Pending tidak mendapat akses chat.
- P0 feature freeze dilakukan pukul 17.00.

## Hari 4 — Stabilization and Release

- Pagi menyelesaikan P1 yang tidak mengganggu P0.
- Pukul 12.00 seluruh fitur dibekukan.
- Siang menjalankan security dan regression test.
- Sore melakukan deployment, bug fixing, seed demo, dan latihan presentasi.
- Pukul 17.00 staging final.

---

# 9. Definition of Ready

Task boleh masuk `In Progress` jika:

- Flow tersedia dalam PRD.
- PIC dan reviewer sudah ditentukan.
- Dependency selesai atau tersedia melalui typed mock.
- Actor dan endpoint diketahui.
- Request dan response type tersedia.
- Zod schema tersedia.
- Error dan authorization policy tersedia.
- Acceptance criteria dapat diuji.

# 10. Definition of Done

Task selesai jika:

- Frontend dan backend terintegrasi.
- Validasi frontend dan backend tersedia.
- Authorization diperiksa server.
- Loading, empty, error, dan unauthorized state tersedia.
- Double click dan retry tidak menggandakan data.
- Tampilan mobile diperiksa.
- Test relevan lulus.
- Tidak ada secret atau data private di log.
- Fitur berjalan di staging.
- Bukti pengujian ditempel pada kartu Kanban.

# 11. Final Demo Gate

Sebelum demo, tim wajib membuktikan:

1. Search kota menampilkan Places, public trip, template kurasi, dan template populer.
2. Ketiga jenis popularitas menggunakan rumus berbeda yang benar.
3. Template usage tidak ganda saat request diulang.
4. Private trip tidak dapat dibaca user lain.
5. Publish membuat host membership dan chat room secara atomik.
6. Dua approval pada kursi terakhir tidak overbook.
7. Pending tidak dapat membaca chat.
8. Reconnect tidak menggandakan message.
9. AI atau provider failure tidak menghapus draft.
10. Budget dihitung backend dan tidak disebut biaya join.
11. Location revoke dan expiry bekerja.
12. PDF dan share link memakai selected version.
13. Review, history, follow, block, dan report mengikuti PRD.
14. Logout membersihkan cache private dan socket.
15. Alur utama dapat digunakan pada mobile dan desktop.
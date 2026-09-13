export const ROUTES = {
  beranda: "/",
  jelajah: "/jelajah",
  tripSaya: "/trip-saya",
  buatTrip: "/buat-trip",
  profil: "/profil",
  profilEdit: "/profil/edit",
  profilUser: (username: string) => `/profil/${username}`,
  profilPengikut: (username: string) => `/profil/${username}/pengikut`,
  profilMengikuti: (username: string) => `/profil/${username}/mengikuti`,
  profilUlasan: (username: string) => `/profil/${username}/ulasan`,
  profilRiwayat: (username: string) => `/profil/${username}/riwayat`,
  adminLaporan: "/admin/laporan",
  masuk: "/masuk",
  daftar: "/daftar",
  lupaPassword: "/lupa-password",
  resetPassword: "/reset-password",
  cekEmail: "/cek-email",
  wisataBali: "/wisata/bali",
  itineraryBali: "/itinerary/bali-3h2m",
} as const;

export type NavKey = "beranda" | "jelajah" | "trip-saya" | "buat-trip" | "profil";

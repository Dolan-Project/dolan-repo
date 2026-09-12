export const ROUTES = {
  beranda: "/",
  jelajah: "/jelajah",
  tripSaya: "/trip-saya",
  buatTrip: "/buat-trip",
  profil: "/profil",
  profilEdit: "/profil/edit",
  masuk: "/masuk",
  daftar: "/daftar",
  lupaPassword: "/lupa-password",
  resetPassword: "/reset-password",
  cekEmail: "/cek-email",
  wisataBali: "/wisata/bali",
  itineraryBali: "/itinerary/bali-3h2m",
} as const;

export function tripDetailHref(tripId: string) {
  return `/trip/${tripId}`;
}

export function tripEditHref(tripId: string) {
  return `/trip/${tripId}/edit`;
}

export type NavKey = "beranda" | "jelajah" | "trip-saya" | "buat-trip" | "profil";

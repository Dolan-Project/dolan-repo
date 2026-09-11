export const ROUTES = {
  beranda: "/",
  jelajah: "/jelajah",
  tripSaya: "/trip-saya",
  buatTrip: "/buat-trip",
  profil: "/profil",
  wisataBali: "/wisata/bali",
  itineraryBali: "/itinerary/bali-3h2m",
} as const;

export type NavKey = "beranda" | "jelajah" | "trip-saya" | "buat-trip" | "profil";

"use strict";

/**
 * Popular Indonesian destinations for demo seed.
 * googlePlaceId may be a known ChIJ when available; otherwise seed script resolves via Text Search.
 * fallbackPhotoUrl is used when GOOGLE_MAPS_SERVER_KEY is absent (no Places quota at runtime).
 */

/** @typedef {{
 *   slug: string;
 *   name: string;
 *   city: string;
 *   query: string;
 *   latitude: number;
 *   longitude: number;
 *   googlePlaceId: string | null;
 *   fallbackPhotoUrl: string;
 * }} DemoDestination */

/** @type {DemoDestination[]} */
const destinations = [
  { slug: "malioboro", name: "Malioboro", city: "Yogyakarta", query: "Malioboro Yogyakarta", latitude: -7.7928, longitude: 110.3658, googlePlaceId: "ChIJxYBx6Da5eY4R2lX2sQ0oYkA", fallbackPhotoUrl: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80" },
  { slug: "prambanan", name: "Candi Prambanan", city: "Yogyakarta", query: "Candi Prambanan Yogyakarta", latitude: -7.752, longitude: 110.4915, googlePlaceId: "ChIJf5UqGYeXeY4RwZVQ9n0s7oE", fallbackPhotoUrl: "https://images.unsplash.com/photo-1584810359583-96fc3448beaa?auto=format&fit=crop&w=1200&q=80" },
  { slug: "parangtritis", name: "Pantai Parangtritis", city: "Yogyakarta", query: "Pantai Parangtritis Yogyakarta", latitude: -8.025, longitude: 110.3294, googlePlaceId: "ChIJV9m3p2KXeY4R8b0xq1m7x9Q", fallbackPhotoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80" },
  { slug: "borobudur", name: "Candi Borobudur", city: "Magelang", query: "Candi Borobudur Magelang", latitude: -7.6079, longitude: 110.2038, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1200&q=80" },
  { slug: "bromo", name: "Gunung Bromo", city: "Probolinggo", query: "Gunung Bromo Jawa Timur", latitude: -7.9425, longitude: 112.953, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80" },
  { slug: "ubud", name: "Ubud Monkey Forest", city: "Ubud", query: "Sacred Monkey Forest Sanctuary Ubud", latitude: -8.5189, longitude: 115.2592, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80" },
  { slug: "tanah-lot", name: "Pura Tanah Lot", city: "Tabanan", query: "Pura Tanah Lot Bali", latitude: -8.6212, longitude: 115.0868, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1200&q=80" },
  { slug: "kuta", name: "Pantai Kuta", city: "Badung", query: "Pantai Kuta Bali", latitude: -8.718, longitude: 115.168, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80" },
  { slug: "nusa-penida", name: "Kelingking Beach", city: "Nusa Penida", query: "Kelingking Beach Nusa Penida", latitude: -8.752, longitude: 115.473, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=1200&q=80" },
  { slug: "labuan-bajo", name: "Labuan Bajo Harbor", city: "Labuan Bajo", query: "Labuan Bajo harbor Flores", latitude: -8.496, longitude: 119.887, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80" },
  { slug: "komodo", name: "Pulau Komodo", city: "Komodo", query: "Komodo Island National Park", latitude: -8.551, longitude: 119.487, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80" },
  { slug: "raja-ampat", name: "Raja Ampat", city: "Waisai", query: "Raja Ampat diving Papua", latitude: -0.234, longitude: 130.507, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=80" },
  { slug: "toba", name: "Danau Toba", city: "Parapat", query: "Danau Toba Sumatera Utara", latitude: 2.666, longitude: 98.875, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80" },
  { slug: "bunaken", name: "Taman Laut Bunaken", city: "Manado", query: "Bunaken Marine Park Manado", latitude: 1.623, longitude: 124.761, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?auto=format&fit=crop&w=1200&q=80" },
  { slug: "lombok-rinjani", name: "Gunung Rinjani", city: "Lombok", query: "Gunung Rinjani Lombok", latitude: -8.411, longitude: 116.457, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80" },
  { slug: "gili-trawangan", name: "Gili Trawangan", city: "Lombok", query: "Gili Trawangan Lombok", latitude: -8.348, longitude: 116.038, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80" },
  { slug: "bandung-tangkuban", name: "Tangkuban Perahu", city: "Bandung", query: "Tangkuban Perahu Bandung", latitude: -6.759, longitude: 107.609, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1501785888041-af3ee95bd4e8?auto=format&fit=crop&w=1200&q=80" },
  { slug: "jakarta-monas", name: "Monumen Nasional", city: "Jakarta", query: "Monumen Nasional Jakarta", latitude: -6.1754, longitude: 106.8272, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1555899434-680039465206?auto=format&fit=crop&w=1200&q=80" },
  { slug: "kota-tua", name: "Kota Tua Jakarta", city: "Jakarta", query: "Kota Tua Jakarta", latitude: -6.135, longitude: 106.813, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1565967511849-76a60a69ae4a?auto=format&fit=crop&w=1200&q=80" },
  { slug: "dieng", name: "Dataran Tinggi Dieng", city: "Wonosobo", query: "Dieng Plateau Wonosobo", latitude: -7.206, longitude: 109.902, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80" },
  { slug: "ijenbaru", name: "Kawah Ijen", city: "Banyuwangi", query: "Kawah Ijen Banyuwangi", latitude: -8.058, longitude: 114.242, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80" },
  { slug: "karimunjawa", name: "Karimunjawa", city: "Jepara", query: "Karimunjawa Islands Jepara", latitude: -5.839, longitude: 110.45, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80" },
  { slug: "belitung", name: "Pantai Tanjung Tinggi", city: "Belitung", query: "Pantai Tanjung Tinggi Belitung", latitude: -2.55, longitude: 107.65, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80" },
  { slug: "wakatobi", name: "Wakatobi", city: "Wakatobi", query: "Wakatobi National Park", latitude: -5.32, longitude: 123.59, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=1200&q=80" },
  { slug: "toraja", name: "Tana Toraja", city: "Rantepao", query: "Tana Toraja Sulawesi", latitude: -2.98, longitude: 119.9, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80" },
  { slug: "makassar-losari", name: "Pantai Losari", city: "Makassar", query: "Pantai Losari Makassar", latitude: -5.143, longitude: 119.407, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80" },
  { slug: "padang-pantai", name: "Pantai Air Manis", city: "Padang", query: "Pantai Air Manis Padang", latitude: -0.995, longitude: 100.36, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80" },
  { slug: "bukittinggi", name: "Jam Gadang", city: "Bukittinggi", query: "Jam Gadang Bukittinggi", latitude: -0.305, longitude: 100.369, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1555899434-680039465206?auto=format&fit=crop&w=1200&q=80" },
  { slug: "palembang-ampera", name: "Jembatan Ampera", city: "Palembang", query: "Jembatan Ampera Palembang", latitude: -2.991, longitude: 104.76, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80" },
  { slug: "semarang-lawang", name: "Lawang Sewu", city: "Semarang", query: "Lawang Sewu Semarang", latitude: -6.984, longitude: 110.411, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1565967511849-76a60a69ae4a?auto=format&fit=crop&w=1200&q=80" },
  { slug: "surabaya-tugu", name: "Tugu Pahlawan", city: "Surabaya", query: "Tugu Pahlawan Surabaya", latitude: -7.246, longitude: 112.738, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=1200&q=80" },
  { slug: "malang-jodipan", name: "Kampung Warna Jodipan", city: "Malang", query: "Kampung Warna Warni Jodipan Malang", latitude: -7.984, longitude: 112.637, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80" },
  { slug: "batur", name: "Gunung Batur", city: "Kintamani", query: "Gunung Batur Bali", latitude: -8.242, longitude: 115.375, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80" },
  { slug: "sanur", name: "Pantai Sanur", city: "Denpasar", query: "Pantai Sanur Bali", latitude: -8.678, longitude: 115.263, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80" },
  { slug: "uluwatu", name: "Pura Luhur Uluwatu", city: "Badung", query: "Pura Luhur Uluwatu Bali", latitude: -8.829, longitude: 115.084, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1200&q=80" },
  { slug: "derawan", name: "Pulau Derawan", city: "Berau", query: "Pulau Derawan Kalimantan Timur", latitude: 2.284, longitude: 118.246, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=80" },
  { slug: "bangka", name: "Pantai Parai", city: "Bangka", query: "Pantai Parai Tenggiri Bangka", latitude: -1.88, longitude: 106.12, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80" },
  { slug: "flores-kelimutu", name: "Danau Kelimutu", city: "Ende", query: "Danau Kelimutu Flores", latitude: -8.762, longitude: 121.814, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1200&q=80" },
  { slug: "sumba", name: "Pantai Nihiwatu", city: "Sumba", query: "Pantai Nihiwatu Sumba", latitude: -9.68, longitude: 119.02, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80" },
  { slug: "yogyakarta-kratons", name: "Keraton Yogyakarta", city: "Yogyakarta", query: "Keraton Yogyakarta", latitude: -7.805, longitude: 110.364, googlePlaceId: null, fallbackPhotoUrl: "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1200&q=80" },
];

function deterministicUuid(seed) {
  const crypto = require("node:crypto");
  const hex = crypto.createHash("sha256").update(`dolan-demo-place:${seed}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function seedPhotoName(googlePlaceId) {
  return `places/${googlePlaceId}/photos/seed`;
}

function localPhotoPath(slug) {
  return `/seed-places/${slug}.jpg`;
}

module.exports = {
  destinations,
  deterministicUuid,
  seedPhotoName,
  localPhotoPath,
};

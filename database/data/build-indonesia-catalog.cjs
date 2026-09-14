"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function uuid(value) {
  const hex = crypto.createHash("sha256").update(`dolan:${value}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

// Editorial starter catalog. Google Places remains the source of live place details,
// photos, ratings and opening hours. This file only defines Dolan's province pages
// and one reusable backpacker route for every Indonesian province.
const rows = [
  ["aceh", "Aceh", "Banda Aceh", ["Masjid Raya Baiturrahman", "Museum Tsunami Aceh", "Pantai Lampuuk", "Pulau Weh", "Danau Laut Tawar"]],
  ["sumatera-utara", "Sumatera Utara", "Medan", ["Danau Toba", "Pulau Samosir", "Istana Maimun", "Air Terjun Sipiso-piso", "Bukit Lawang"]],
  ["sumatera-barat", "Sumatera Barat", "Padang", ["Jam Gadang", "Ngarai Sianok", "Lembah Harau", "Istano Basa Pagaruyung", "Kepulauan Mentawai"]],
  ["riau", "Riau", "Pekanbaru", ["Istana Siak Sri Indrapura", "Candi Muara Takus", "Danau Raja", "Taman Nasional Tesso Nilo", "Riau Fantasi"]],
  ["kepulauan-riau", "Kepulauan Riau", "Tanjungpinang", ["Pulau Penyengat", "Lagoi Bay", "Pantai Trikora", "Gurun Pasir Busung", "Jembatan Barelang"]],
  ["jambi", "Jambi", "Jambi", ["Candi Muaro Jambi", "Gunung Kerinci", "Danau Kaco", "Geopark Merangin", "Danau Gunung Tujuh"]],
  ["sumatera-selatan", "Sumatera Selatan", "Palembang", ["Jembatan Ampera", "Pulau Kemaro", "Benteng Kuto Besak", "Gunung Dempo", "Danau Ranau"]],
  ["kepulauan-bangka-belitung", "Kepulauan Bangka Belitung", "Pangkalpinang", ["Pantai Tanjung Tinggi", "Pulau Lengkuas", "Danau Kaolin", "Pantai Parai Tenggiri", "Museum Kata Andrea Hirata"]],
  ["bengkulu", "Bengkulu", "Bengkulu", ["Benteng Marlborough", "Pantai Panjang", "Rumah Pengasingan Bung Karno", "Danau Dendam Tak Sudah", "Pulau Enggano"]],
  ["lampung", "Lampung", "Bandar Lampung", ["Taman Nasional Way Kambas", "Pulau Pahawang", "Teluk Kiluan", "Pantai Gigi Hiu", "Gunung Anak Krakatau"]],
  ["dki-jakarta", "DKI Jakarta", "Jakarta", ["Monumen Nasional", "Kota Tua Jakarta", "Museum MACAN", "Taman Mini Indonesia Indah", "Kepulauan Seribu"]],
  ["jawa-barat", "Jawa Barat", "Bandung", ["Kawah Putih", "Tangkuban Perahu", "Kebun Raya Bogor", "Green Canyon Pangandaran", "Situ Patenggang"]],
  ["banten", "Banten", "Serang", ["Taman Nasional Ujung Kulon", "Pantai Anyer", "Pulau Peucang", "Baduy Dalam", "Tanjung Lesung"]],
  ["jawa-tengah", "Jawa Tengah", "Semarang", ["Candi Borobudur", "Dataran Tinggi Dieng", "Lawang Sewu", "Karimunjawa", "Candi Prambanan"]],
  ["di-yogyakarta", "DI Yogyakarta", "Yogyakarta", ["Jalan Malioboro", "Keraton Yogyakarta", "Taman Sari", "Pantai Parangtritis", "Tebing Breksi"]],
  ["jawa-timur", "Jawa Timur", "Surabaya", ["Gunung Bromo", "Kawah Ijen", "Tumpak Sewu", "Taman Nasional Baluran", "Pantai Papuma"]],
  ["bali", "Bali", "Denpasar", ["Pura Tanah Lot", "Tegallalang Rice Terrace", "Pura Uluwatu", "Nusa Penida", "Gunung Batur"]],
  ["nusa-tenggara-barat", "Nusa Tenggara Barat", "Mataram", ["Gunung Rinjani", "Gili Trawangan", "Pantai Kuta Mandalika", "Desa Sade", "Air Terjun Tiu Kelep"]],
  ["nusa-tenggara-timur", "Nusa Tenggara Timur", "Kupang", ["Pulau Padar", "Taman Nasional Komodo", "Danau Kelimutu", "Desa Wae Rebo", "Pantai Pink Labuan Bajo"]],
  ["kalimantan-barat", "Kalimantan Barat", "Pontianak", ["Tugu Khatulistiwa", "Danau Sentarum", "Bukit Kelam", "Pantai Temajuk", "Keraton Kadriah"]],
  ["kalimantan-tengah", "Kalimantan Tengah", "Palangka Raya", ["Taman Nasional Tanjung Puting", "Bukit Tangkiling", "Danau Tahai", "Taman Nasional Sebangau", "Sungai Kahayan"]],
  ["kalimantan-selatan", "Kalimantan Selatan", "Banjarmasin", ["Pasar Terapung Lok Baintan", "Bukit Matang Kaladan", "Loksado", "Pulau Kembang", "Tahura Sultan Adam"]],
  ["kalimantan-timur", "Kalimantan Timur", "Samarinda", ["Kepulauan Derawan", "Pulau Maratua", "Danau Labuan Cermin", "Desa Budaya Pampang", "Bukit Bangkirai"]],
  ["kalimantan-utara", "Kalimantan Utara", "Tanjung Selor", ["Taman Nasional Kayan Mentarang", "Pulau Bunyu", "Pantai Amal", "Air Terjun Semolon", "Hutan Mangrove Tarakan"]],
  ["sulawesi-utara", "Sulawesi Utara", "Manado", ["Taman Nasional Bunaken", "Likupang", "Danau Linow", "Gunung Lokon", "Pulau Siladen"]],
  ["gorontalo", "Gorontalo", "Gorontalo", ["Taman Laut Olele", "Pulau Saronde", "Benteng Otanaha", "Hiu Paus Botubarani", "Pantai Dunu"]],
  ["sulawesi-tengah", "Sulawesi Tengah", "Palu", ["Kepulauan Togean", "Danau Poso", "Taman Nasional Lore Lindu", "Pantai Tanjung Karang", "Air Terjun Saluopa"]],
  ["sulawesi-barat", "Sulawesi Barat", "Mamuju", ["Pulau Karampuang", "Pantai Dato", "Air Terjun Tamasapi", "Puncak Mamuju City", "Desa Adat Rambu Saratu"]],
  ["sulawesi-selatan", "Sulawesi Selatan", "Makassar", ["Tana Toraja", "Pantai Losari", "Rammang-Rammang", "Tanjung Bira", "Benteng Rotterdam"]],
  ["sulawesi-tenggara", "Sulawesi Tenggara", "Kendari", ["Wakatobi", "Pulau Labengki", "Pantai Nambo", "Air Terjun Moramo", "Benteng Keraton Buton"]],
  ["maluku", "Maluku", "Ambon", ["Pantai Ora", "Kepulauan Banda", "Pantai Natsepa", "Benteng Amsterdam", "Pulau Kei"]],
  ["maluku-utara", "Maluku Utara", "Sofifi", ["Pulau Morotai", "Danau Tolire", "Gunung Gamalama", "Pantai Sulamadaha", "Benteng Oranje"]],
  ["papua-barat", "Papua Barat", "Manokwari", ["Pegunungan Arfak", "Pulau Mansinam", "Pantai Pasir Putih Manokwari", "Danau Anggi", "Teluk Doreri"]],
  ["papua-barat-daya", "Papua Barat Daya", "Sorong", ["Raja Ampat", "Piaynemo", "Wayag", "Desa Wisata Arborek", "Pulau Misool"]],
  ["papua", "Papua", "Jayapura", ["Danau Sentani", "Pantai Base-G", "Bukit Teletubbies Jayapura", "Desa Wisata Asei", "Pegunungan Cycloop"]],
  ["papua-selatan", "Papua Selatan", "Merauke", ["Taman Nasional Wasur", "Pantai Lampu Satu", "Monumen Kapsul Waktu", "Musamus Merauke", "Sota Perbatasan RI-PNG"]],
  ["papua-tengah", "Papua Tengah", "Nabire", ["Taman Nasional Teluk Cenderawasih", "Pantai Nabire", "Danau Paniai", "Air Terjun Bihewa", "Pulau Ahe"]],
  ["papua-pegunungan", "Papua Pegunungan", "Wamena", ["Lembah Baliem", "Danau Habema", "Pasir Putih Aikima", "Desa Wamena", "Goa Kontilola"]],
];

const catalog = rows.map(([slug, name, capital, placeNames], provinceIndex) => ({
  slug,
  name,
  capital,
  description: `${name} menawarkan perpaduan alam, budaya, dan kuliner lokal. Kurasi DOLAN ini menjadi titik awal perjalanan backpacker dan tetap perlu disesuaikan dengan cuaca, jam operasional, serta kondisi transportasi terbaru.`,
  heroQuery: `${placeNames[0]}, ${name}, Indonesia`,
  featuredRank: provinceIndex + 1,
  places: placeNames.map((placeName, index) => ({
    name: placeName,
    city: capital,
    rank: index + 1,
    description: `${placeName} adalah salah satu destinasi populer di ${name}. Detail foto, rating, alamat, dan jam buka ditampilkan dari Google Places saat halaman dibuka.`,
    searchQuery: `${placeName}, ${name}, Indonesia`,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${placeName}, ${name}, Indonesia`)}`,
  })),
  template: {
    id: uuid(`province-template:${slug}`),
    title: `Rute Backpacker ${name}`,
    description: `Rute awal DOLAN untuk mengenal destinasi unggulan ${name} secara efisien.`,
    durationDays: placeNames.length >= 5 ? 3 : 2,
    transportMode: "Transportasi umum + sewa lokal",
    budgetLow: 750000,
    budgetHigh: 3500000,
    stops: placeNames.map((placeName, index) => ({
      day: Math.min(3, Math.floor(index / 2) + 1),
      sequence: (index % 2) + 1,
      name: placeName,
      durationMinutes: index % 2 === 0 ? 150 : 120,
      notes: index === 0 ? "Mulai pagi untuk menghindari antrean dan cuaca terik." : "Periksa waktu tempuh dan jam buka sebelum berangkat.",
    })),
  },
}));

if (catalog.length !== 38 || catalog.some((province) => province.places.length !== 5)) {
  throw new Error("Catalog must contain exactly 38 provinces and 5 places per province");
}

fs.writeFileSync(
  path.join(__dirname, "indonesia-provinces.json"),
  `${JSON.stringify(catalog, null, 2)}\n`,
);

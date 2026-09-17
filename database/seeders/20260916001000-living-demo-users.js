"use strict";

/**
 * 15 living demo users. Password for living01–living15@dolan.demo: password123
 * Idempotent: skips if living01 already exists.
 * Undo deletes only this seed's users, trips, posts, and living-demo places.
 */

const crypto = require("node:crypto");

const DEMO_PASSWORD = "password123";
const EMAIL_DOMAIN = "dolan.demo";

const PHOTOS = [
  "https://upload.wikimedia.org/wikipedia/commons/a/af/Tanah_Lot.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/3/3a/Kelingking_Beach.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/5/5b/Raja_Ampat.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/c/c1/Labuan_Bajo.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/8/8c/Borobudur-Nothwest-view.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/9/9f/Mount_Bromo.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/c/cc/Rinjani.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/5/5a/Tangkuban_Perahu.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/8/86/Pura_Ulun_Danu_Bratan.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/c/cf/Tegallalang_Rice_Terrace.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/d/db/Beach_in_Bali.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/d/d5/Ijen_Crater.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/b/b6/Lake_Toba.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/8/8e/Dieng_Plateau.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/8/83/Green_Canyon_Pangandaran.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/6/63/Parangtritis.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/6/61/Rice_terrace_in_Bali.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/a/a0/Malioboro_Street.jpg",
];

const FALLBACK_PLACES = [
  { key: "bali", name: "Tanah Lot", city: "Tabanan", lat: -8.6212, lng: 115.0868, photo: 0 },
  { key: "penida", name: "Kelingking Beach", city: "Nusa Penida", lat: -8.7511, lng: 115.4676, photo: 1 },
  { key: "raja", name: "Raja Ampat", city: "Raja Ampat", lat: -0.5625, lng: 130.6541, photo: 2 },
  { key: "bajo", name: "Labuan Bajo", city: "Labuan Bajo", lat: -8.4964, lng: 119.8877, photo: 3 },
  { key: "yogya", name: "Candi Borobudur", city: "Magelang", lat: -7.6079, lng: 110.2038, photo: 4 },
  { key: "bromo", name: "Gunung Bromo", city: "Probolinggo", lat: -7.9425, lng: 112.953, photo: 5 },
  { key: "rinjani", name: "Gunung Rinjani", city: "Lombok", lat: -8.4118, lng: 116.457, photo: 6 },
  { key: "tangkuban", name: "Tangkuban Perahu", city: "Bandung", lat: -6.7596, lng: 107.6098, photo: 7 },
];

const PEOPLE = [
  {
    username: "living_sari",
    name: "Sari Wulandari",
    domicile: "Denpasar",
    bio: "Host open trip senja dan sunrise. Biasanya bawa kelompok kecil, itinerary ketat, kopi wajib.",
    instagram: "https://instagram.com/living_sari",
    tiktok: null,
    avatar: 0,
    cover: 10,
    caption: "Senja Tanah Lot, trip ke-40 dan tetap deg-degan.",
  },
  {
    username: "living_bima",
    name: "Bima Pratama",
    domicile: "Sorong",
    bio: "Snorkeling dulu, cerita kemudian. Raja Ampat adalah halaman belakangku.",
    instagram: "https://instagram.com/living_bima",
    tiktok: "https://tiktok.com/@living_bima",
    avatar: 2,
    cover: 12,
    caption: "Air sebening kaca, arus agak nakal.",
  },
  {
    username: "living_dewi",
    name: "Dewi Lestari",
    domicile: "Yogyakarta",
    bio: "Kurator jalan kaki. Kuil, pasar, dan sate kambing di luar itinerary resmi.",
    instagram: "https://instagram.com/living_dewi",
    tiktok: null,
    avatar: 4,
    cover: 17,
    caption: "Borobudur sebelum gerbang ramai.",
  },
  {
    username: "living_raka",
    name: "Raka Putra",
    domicile: "Bekasi",
    bio: "Baru pindah dari commuter line ke tiket kapal. Masih belajar packing.",
    instagram: null,
    tiktok: null,
    avatar: 15,
    cover: 16,
    caption: "Sawah pertama yang kufoto sendiri.",
  },
  {
    username: "living_nia",
    name: "Nia Safitri",
    domicile: "Jakarta",
    bio: "Follow dulu, baru tanya slot. Koleksi rekomendasi warung lebih panjang dari itinerary.",
    instagram: "https://instagram.com/living_nia",
    tiktok: "https://tiktok.com/@living_nia",
    avatar: 11,
    cover: 9,
    caption: "Terasering yang bikin lupa email kantor.",
  },
  {
    username: "living_farhan",
    name: "Farhan Aziz",
    domicile: "Malang",
    bio: "Sunrise Bromo jam 3 pagi. Yang telat ditinggal di jeep, maaf bukan maaf.",
    instagram: "https://instagram.com/living_farhan",
    tiktok: null,
    avatar: 5,
    cover: 11,
    caption: "Kawah Ijen, biru yang tidak bisa dijelaskan chat.",
  },
  {
    username: "living_lala",
    name: "Lala Kusuma",
    domicile: "Mataram",
    bio: "Open trip Rinjani buat pemula. Belum sempat dikasih rating — padahal sapinya ramah.",
    instagram: "https://instagram.com/living_lala",
    tiktok: null,
    avatar: 6,
    cover: 14,
    caption: "Ngarai hijau, airnya dingin sampai betis.",
  },
  {
    username: "living_gita",
    name: "Gita Maharani",
    domicile: "Semarang",
    bio: "Jarang jadi host. Senang diajak, biasanya yang bawa P3K dan camilan.",
    instagram: null,
    tiktok: null,
    avatar: 13,
    cover: 1,
    caption: "Tebing yang kelihatan dekat, jalannya tiga jam.",
  },
  {
    username: "living_hadi",
    name: "Hadi Nugroho",
    domicile: "Bandung",
    bio: "Weekend trip, budget ketat, briefing kadang telat. Rating-ku jujur, bukan katalog.",
    instagram: "https://instagram.com/living_hadi",
    tiktok: null,
    avatar: 7,
    cover: 8,
    caption: "Danau Bratan sebelum kabut turun.",
  },
  {
    username: "living_intan",
    name: "Intan Permata",
    domicile: "Denpasar",
    bio: "Trip pendek, peserta sedikit, pulang tepat waktu. Ulasan yang masuk semuanya hangat.",
    instagram: "https://instagram.com/living_intan",
    tiktok: "https://tiktok.com/@living_intan",
    avatar: 10,
    cover: 0,
    caption: "Pantai yang sama, jam yang berbeda.",
  },
  {
    username: "living_joko",
    name: "Joko Susilo",
    domicile: "Solo",
    bio: "Punya satu rencana trip pribadi. Belum posting foto — kameranya masih di kardus.",
    instagram: null,
    tiktok: null,
    avatar: 17,
    cover: 4,
    caption: null,
  },
  {
    username: "living_kirana",
    name: "Kirana Ayu",
    domicile: "Surabaya",
    bio: "Foto dulu, caption belakangan. Momenku yang paling sering disukai justru yang blur.",
    instagram: "https://instagram.com/living_kirana",
    tiktok: "https://tiktok.com/@living_kirana",
    avatar: 9,
    cover: 16,
    caption: "Sawah yang kedengaran sepi, padahal ada motor di belakang.",
  },
  {
    username: "living_leo",
    name: "Leo Hartono",
    domicile: "Jakarta",
    bio: "Mengikuti lebih banyak orang daripada yang mengikutiku. Slot trip kucari lewat timeline.",
    instagram: "https://instagram.com/living_leo",
    tiktok: null,
    avatar: 3,
    cover: 2,
    caption: "Kapal kecil, cakrawala lebar.",
  },
  {
    username: "living_maya",
    name: "Maya Sari",
    domicile: "Medan",
    bio: "Trip privat ke utara, belum jadi open. Danau Toba masih di daftar, bukan di feed.",
    instagram: null,
    tiktok: null,
    avatar: 12,
    cover: 13,
    caption: "Danau yang kelihatan seperti laut.",
  },
  {
    username: "living_omar",
    name: "Omar Fadil",
    domicile: "Makassar",
    bio: "Host yang sering ikut trip orang lain juga. Kalau itinerary berubah, aku yang chat duluan.",
    instagram: "https://instagram.com/living_omar",
    tiktok: "https://tiktok.com/@living_omar",
    avatar: 2,
    cover: 3,
    caption: "Dermaga Labuan Bajo, jam masih biru.",
  },
];

/** Reviews: [reviewerIndex, revieweeIndex, communication, attitude, comment] */
const TRIPS = [
  {
    host: 0,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 0,
    title: (p) => `Sunrise bareng di ${p.name}`,
    description: "Naik sebelum gerbang ramai, pulang lewat warung kopi di tikungan.",
    start: -12,
    days: 2,
    budget: 450000,
    max: 6,
    transport: "MOTORBIKE",
    members: [1, 2, 9],
    reviews: [
      [1, 0, 5, 5, "Sari ngerangkum briefing dengan jelas. Anak baru pun nggak nyasar."],
      [2, 0, 5, 5, "Waktunya ketat tapi tetap sempat nunggu yang ketinggalan sandal."],
      [9, 0, 5, 5, "Host yang paling enak diajak, komunikasinya nggak lemot."],
    ],
    feedback: true,
  },
  {
    host: 0,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 1,
    title: (p) => `Tebing ${p.name} seharian`,
    description: "Jalan menurun lama, air minum dua botol, foto di ujung tebing cuma sepuluh menit.",
    start: -78,
    days: 3,
    budget: 980000,
    max: 5,
    transport: "CAR",
    members: [14, 7],
    reviews: [
      [14, 0, 5, 5, "Sari hafal tikungan yang licin. Nggak ada drama minus orang."],
      [7, 0, 5, 5, "P3K yang kubawa nggak kepakai. Itinerarynya sudah aman."],
      [0, 7, 4, 4, "Gita yang bawa P3K dan tetap tidak mengomel di tanjakan."],
      [14, 7, 4, 4, "Tenang, mengikuti jadwal, tidak menambah drama."],
    ],
  },
  {
    host: 0,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 0,
    title: () => "Sawah Tegallalang sebelum tour bus",
    description: "Berangkat jam enam, selesai sebelum pelataran jadi parkiran motor.",
    start: -140,
    days: 1,
    budget: 275000,
    max: 8,
    transport: "MOTORBIKE",
    members: [11, 13],
    reviews: [
      [11, 0, 5, 5, "Titik fotonya dipilih yang sepi. Kirana puas, waktu pun masuk."],
      [13, 0, 5, 5, "Sari sabar nunggu yang motretnya lama."],
    ],
  },
  {
    host: 0,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 1,
    title: () => "Open trip tebing Nusa Penida",
    description: "Kapal pagi, tebing siang, hotel sebelum magrib. Slot kecil.",
    start: -200,
    days: 2,
    budget: 1250000,
    max: 6,
    transport: "BOAT",
    members: [5, 12],
    reviews: [
      [5, 0, 5, 5, "Koordinasi kapal dan jeep-nya rapi."],
      [12, 0, 4, 5, "Komunikasinya sempat telat di grup, tapi di lapangan enak."],
    ],
  },
  {
    host: 0,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 0,
    title: () => "Senja Pantai di Bali selatan",
    description: "Trip pendek buat yang cuma punya satu hari libur.",
    start: -260,
    days: 1,
    budget: 180000,
    max: 10,
    transport: "CAR",
    members: [8],
    reviews: [[8, 0, 4, 5, "Titik kumpul sempat geser sepihak. Sisanya beres."]],
  },
  {
    host: 1,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 2,
    title: (p) => `Snorkeling di ${p.name}`,
    description: "Speedboat pagi, tiga spot, batuk-batuk karena terlalu lama di air.",
    start: -36,
    days: 4,
    budget: 2800000,
    max: 6,
    transport: "BOAT",
    members: [0, 14],
    reviews: [
      [0, 1, 5, 5, "Bima hafal arus. Yang nggak kuat dia yang nyuruh naik duluan."],
      [14, 1, 5, 5, "Briefing keselamatan paling jelas yang pernah kudengar."],
    ],
  },
  {
    host: 1,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 3,
    title: (p) => `Dermaga senja ${p.name}`,
    description: "Pulau kecil, bukan hunting komodo. Makan siang bawa dari homestay.",
    start: -110,
    days: 3,
    budget: 1750000,
    max: 5,
    transport: "FLIGHT",
    members: [7, 2],
    reviews: [
      [7, 1, 4, 4, "Asik, cuma update cuaca kadang telat masuk grup."],
      [2, 1, 4, 4, "Ritme jalan agak cepat buat yang baru first trip laut."],
    ],
  },
  {
    host: 1,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 2,
    title: () => "Piaynemo viewpoint, satu hari",
    description: "Naik paling atas sebelum kabut. Turun pelan, lutut yang ngomong.",
    start: -190,
    days: 2,
    budget: 2100000,
    max: 4,
    transport: "BOAT",
    members: [9, 11],
    reviews: [[9, 1, 5, 5, "Intan nggak nyasar sekali pun. Bima yang jaga tempo."]],
  },
  {
    host: 2,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 4,
    title: (p) => `Pagi-pagi ke ${p.name}`,
    description: "Masuk gerbang pertama, keluar sebelum terik. Sarapan di seberang parkir.",
    start: -22,
    days: 1,
    budget: 320000,
    max: 8,
    transport: "CAR",
    members: [7, 13, 11, 8],
    reviews: [
      [7, 2, 4, 4, "Dewi enak diajak, cuma briefingnya agak panjang."],
      [13, 2, 4, 5, "Tau jalur yang nggak ketutup vendor."],
      [11, 2, 5, 4, "Banyak waktu foto, sedikit waktu istirahat."],
      [8, 2, 4, 4, "Oke, tapi titik kumpul sempat membingungkan."],
    ],
  },
  {
    host: 2,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 4,
    title: () => "Jalan kaki Malioboro sampai senja",
    description: "Tanpa itinerary kaku. Berhenti tiap lesehan yang baunya enak.",
    start: -160,
    days: 2,
    budget: 410000,
    max: 6,
    transport: "TRAIN",
    members: [12],
    reviews: [],
  },
  {
    host: 2,
    status: "OPEN",
    visibility: "PUBLIC",
    place: 4,
    title: () => "Open trip Parangtritis minggu depan",
    description: "Masih ada dua slot. Ombak besar, bukan untuk berenang jauh.",
    start: 16,
    days: 2,
    budget: 390000,
    max: 6,
    transport: "CAR",
    members: [],
    joins: [{ user: 12, message: "Masih muat satu orang dari Jakarta? Bisa kereta pagi." }],
    reviews: [],
  },
  {
    host: 5,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 5,
    title: (p) => `Jeep sunrise ${p.name}`,
    description: "Jemput jam 2, bajunya dua lapis, kopi disiapkan di homestay.",
    start: -18,
    days: 2,
    budget: 650000,
    max: 7,
    transport: "JEEP",
    members: [0, 12],
    reviews: [
      [0, 5, 5, 5, "Farhan tepat waktu sampai menit. Dinginnya yang nggak."],
      [12, 5, 5, 5, "Update jeep-nya terus. Nggak ada yang ketinggalan di pos."],
      [5, 12, 5, 4, "Leo ikut alur, cuma chat-nya kadang tenggelam di grup."],
      [0, 12, 4, 5, "Ramah di jeep. Konfirmasi keberangkatan sempat molor."],
    ],
  },
  {
    host: 5,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 5,
    title: () => "Kawah Ijen, masker dua lapis",
    description: "Naik malam, turun sebelum bau belerang bikin pusing. Slot kecil.",
    start: -95,
    days: 2,
    budget: 720000,
    max: 5,
    transport: "CAR",
    members: [1, 14],
    reviews: [
      [1, 5, 4, 5, "Tempo naik agak cepat, tapi Farhan nunggu di tanjakan terakhir."],
      [14, 5, 5, 4, "Sikapnya tegas. Chat sebelumnya agak singkat."],
    ],
  },
  {
    host: 5,
    status: "ONGOING",
    visibility: "PUBLIC",
    place: 5,
    title: () => "Bromo sedang berjalan: jeep dan sunrise",
    description: "Grup ini sudah di Cemoro Lawang. Chat aktif, rating menyusul setelah selesai.",
    start: -1,
    days: 3,
    budget: 680000,
    max: 6,
    transport: "JEEP",
    members: [4, 7, 12],
    reviews: [],
  },
  {
    host: 6,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 6,
    title: (p) => `${p.name} untuk pemula`,
    description: "Selesai tanpa ulasan. Peserta pulang capek, host lupa mengingatkan rating.",
    start: -55,
    days: 3,
    budget: 890000,
    max: 8,
    transport: "CAR",
    members: [13],
    reviews: [],
  },
  {
    host: 6,
    status: "OPEN",
    visibility: "PUBLIC",
    place: 6,
    title: () => "Open trip Rinjani, slot masih longgar",
    description: "Bukan summit tembus. Savana, danau, dan turun di hari ketiga.",
    start: 24,
    days: 3,
    budget: 950000,
    max: 10,
    transport: "CAR",
    members: [],
    joins: [{ user: 3, message: "Aku pemula total. Masih ada slot yang pelan-pelan?" }],
    reviews: [],
  },
  {
    host: 8,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 7,
    title: () => "Kawah Tangkuban yang berasap",
    description: "Weekend singkat. Briefing sempat molor, makan siang justru enak.",
    start: -28,
    days: 1,
    budget: 210000,
    max: 8,
    transport: "MOTORBIKE",
    members: [2, 0, 1],
    reviews: [
      [2, 8, 4, 4, "Telat 25 menit di titik kumpul, sisanya lancar."],
      [0, 8, 4, 4, "Budget pas, komunikasinya agak putus-putus."],
      [1, 8, 4, 4, "Oke buat trip spontan, jangan berharap itinerary militer."],
    ],
  },
  {
    host: 8,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 7,
    title: () => "Green canyon sehari dari Bandung",
    description: "Body raft pendek. Yang nggak mau basah diminta jujur dari awal.",
    start: -130,
    days: 1,
    budget: 340000,
    max: 6,
    transport: "CAR",
    members: [13, 7],
    reviews: [
      [13, 8, 4, 4, "Jalanannya indah, info cuaca datang mepet."],
      [7, 8, 3, 3, "Sempat salah titik jemput. Perlu lebih teliti."],
    ],
  },
  {
    host: 8,
    status: "OPEN",
    visibility: "PUBLIC",
    place: 7,
    title: () => "Open trip kawah dan kopi Bandung",
    description: "Masih menerima join. Berangkat subuh, pulang sore di hari yang sama.",
    start: 11,
    days: 1,
    budget: 185000,
    max: 8,
    transport: "CAR",
    members: [],
    joins: [{ user: 4, message: "Bisa sekalian mampir ke warung kopi yang kemarin kamu cerita?" }],
    reviews: [],
  },
  {
    host: 9,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 0,
    title: () => "Pantai senja, pulang tepat waktu",
    description: "Empat orang, satu mobil, tidak ada yang ditambah di menit terakhir.",
    start: -9,
    days: 1,
    budget: 220000,
    max: 4,
    transport: "CAR",
    members: [0, 1],
    reviews: [
      [0, 9, 5, 5, "Intan paling rapi yang pernah kuikuti. Semuanya sesuai janji."],
      [1, 9, 5, 5, "Sikapnya tenang, chat-nya langsung ke inti."],
    ],
  },
  {
    host: 14,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 3,
    title: (p) => `Pagi di dermaga ${p.name}`,
    description: "Sarapan ikan, naik perahu, turun sebelum angin siang.",
    start: -44,
    days: 3,
    budget: 1600000,
    max: 6,
    transport: "BOAT",
    members: [1, 5],
    reviews: [
      [1, 14, 5, 5, "Omar yang koordinasi kapal. Nggak ada yang nunggu dua jam."],
      [5, 14, 5, 5, "Tegas dan tetap ramah kalau ada yang mabuk laut."],
    ],
  },
  {
    host: 14,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 2,
    title: () => "Hopping pulau, bukan paket megah",
    description: "Tiga homestay sederhana. Uang makan dipisah dari budget kapal.",
    start: -100,
    days: 4,
    budget: 2400000,
    max: 5,
    transport: "BOAT",
    members: [0, 9],
    reviews: [
      [0, 14, 5, 5, "Omar update perubahan cuaca sebelum orang bertanya."],
      [9, 14, 5, 5, "Kelompok kecil, keputusan cepat, nggak ada yang ditinggal."],
    ],
  },
  {
    host: 14,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 1,
    title: () => "Kelingking versi pelan",
    description: "Turun tidak dipaksa. Yang lututnya protes menunggu di atas.",
    start: -170,
    days: 2,
    budget: 1100000,
    max: 6,
    transport: "CAR",
    members: [11, 7],
    reviews: [
      [11, 14, 5, 5, "Banyak waktu foto tanpa mengorbankan yang cape."],
      [7, 14, 5, 5, "Omar ngecek air minum semua orang sebelum turun."],
    ],
  },
  {
    host: 14,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 5,
    title: () => "Bromo dari Malang, bukan dari paket online",
    description: "Jeep dibagi rata. Yang mabuk di tikungan dipindah ke depan.",
    start: -230,
    days: 2,
    budget: 590000,
    max: 7,
    transport: "JEEP",
    members: [2, 12],
    reviews: [
      [2, 14, 5, 5, "Rencana berubah karena kabut, Omar yang jelaskan duluan."],
      [12, 14, 4, 3, "Sikapnya kadang tegas berlebihan. Info tetap lengkap."],
    ],
  },
  {
    host: 11,
    status: "COMPLETED",
    visibility: "PUBLIC",
    place: 0,
    title: () => "Berburu cahaya di terasering",
    description: "Bukan hiking. Berdiri, motret, pindah, motret lagi.",
    start: -33,
    days: 1,
    budget: 260000,
    max: 5,
    transport: "MOTORBIKE",
    members: [0, 9],
    reviews: [
      [0, 11, 5, 4, "Kirana tenang, cuma kadang lupa ngabarin pindah spot."],
      [9, 11, 4, 5, "Senang diajak. Yang motretnya lama nggak dimarahi."],
    ],
  },
  {
    host: 10,
    status: "OPEN",
    visibility: "PRIVATE",
    place: 4,
    title: () => "Rencana pribadi: Yogya pelan-pelan",
    description: "Belum dibuka ke publik. Joko masih menyusun hari kedua.",
    start: 40,
    days: 3,
    budget: 500000,
    max: 2,
    transport: "TRAIN",
    members: [],
    reviews: [],
  },
  {
    host: 13,
    status: "OPEN",
    visibility: "PRIVATE",
    place: 6,
    title: () => "Catatan pribadi sebelum ke utara",
    description: "Belum open. Maya masih menghitung kereta vs pesawat.",
    start: 19,
    days: 4,
    budget: 1500000,
    max: 3,
    transport: "FLIGHT",
    members: [],
    reviews: [],
  },
];

const POSTS = [
  { author: 0, photo: 0, trip: 0, daysAgo: 2, likes: 8, caption: "Senja Tanah Lot dari sisi yang tidak kena tripod orang. Anginnya lebih berisik dari grup chat." },
  { author: 14, photo: 3, trip: 20, daysAgo: 3, likes: 6, caption: "Dermaga Labuan Bajo jam masih biru. Kopi habis sebelum perahu datang." },
  { author: 11, photo: 16, trip: 24, daysAgo: 1, likes: 12, caption: "Sawah ini blur karena aku tertawa. Justru yang ini yang paling banyak disukai." },
  { author: 5, photo: 5, trip: 11, daysAgo: 4, likes: 7, caption: "Bromo jam 4.37. Jeep bergetar, kopi tumpah, matahari tetap naik." },
  { author: 9, photo: 10, trip: 19, daysAgo: 5, likes: 4, caption: "Pulang tepat waktu itu juga semacam pemandangan. Ombaknya jadi bonus." },
  { author: 1, photo: 2, trip: 5, daysAgo: 6, likes: 9, caption: "Raja Ampat tidak butuh filter. Butuh jaket yang tidak kebawa angin." },
  { author: 0, photo: 1, trip: 1, daysAgo: 8, likes: 5, caption: "Kelingking dari atas. Sepuluh menit di ujung, tiga jam jalan kaki." },
  { author: 2, photo: 4, trip: 8, daysAgo: 7, likes: 3, caption: "Borobudur sebelum vendor buka. Kabutnya lebih ramah daripada heat." },
  { author: 11, photo: 9, trip: null, daysAgo: 9, likes: 11, caption: "Terasering yang kedengaran sepi. Di belakang ada motor, di foto tidak kelihatan." },
  { author: 4, photo: 9, trip: null, daysAgo: 10, likes: 2, caption: "Nia cuma lewat, tapi sawahnya nempel di galeri. Nanti kalau ada slot, aku ikut." },
  { author: 7, photo: 1, trip: 1, daysAgo: 11, likes: 3, caption: "Turun pelan. Lututku yang host, bukan jadwalnya." },
  { author: 14, photo: 2, trip: 21, daysAgo: 12, likes: 5, caption: "Hopping pulau versi sederhana. Homestay-nya kipas, pemandangannya tidak." },
  { author: 0, photo: 8, trip: null, daysAgo: 14, likes: 6, caption: "Ulun Danu sebelum kabut makan menara. Aku datang terlalu sering untuk tetap terkejut, tapi tetap terkejut." },
  { author: 5, photo: 11, trip: 12, daysAgo: 13, likes: 8, caption: "Ijen biru. Masker dua lapis, cerita satu lapis: indah dan bau." },
  { author: 8, photo: 7, trip: 16, daysAgo: 15, likes: 1, caption: "Tangkuban berasap. Briefingku telat, kawahnya tidak." },
  { author: 1, photo: 3, trip: 6, daysAgo: 16, likes: 4, caption: "Labuan Bajo dari perahu. Ikan makan siang lebih berkesan daripada viewpoint." },
  { author: 9, photo: 0, trip: null, daysAgo: 17, likes: 3, caption: "Pantai yang sama, jam berbeda. Kali ini tidak ada yang ketinggalan di warung." },
  { author: 11, photo: 10, trip: null, daysAgo: 18, likes: 10, caption: "Pasir yang kelihatan lembut di foto ternyata panas. Aku tidak menyesal." },
  { author: 2, photo: 17, trip: 9, daysAgo: 19, likes: 2, caption: "Malioboro bukan destinasi sunyi. Tapi lesehannya jujur." },
  { author: 6, photo: 6, trip: 14, daysAgo: 20, likes: 2, caption: "Rinjani buat pemula. Savana kering, air minum basah, ulasan belum ada." },
  { author: 0, photo: 16, trip: 2, daysAgo: 21, likes: 7, caption: "Tegallalang sebelum tour bus. Hijau yang tidak butuh caption panjang." },
  { author: 14, photo: 1, trip: 22, daysAgo: 22, likes: 4, caption: "Kelingking versi pelan. Yang lututnya protes menunggu di atas, pemandangannya tetap." },
  { author: 5, photo: 13, trip: null, daysAgo: 23, likes: 3, caption: "Dataran tinggi yang dinginnya bukan dari AC hotel." },
  { author: 3, photo: 16, trip: null, daysAgo: 4, likes: 1, caption: "Foto pertama. Sawahnya tidak tahu aku masih belajar packing." },
  { author: 9, photo: 15, trip: null, daysAgo: 24, likes: 2, caption: "Parangtritis dari jauh. Ombak tidak diajak berunding." },
  { author: 1, photo: 12, trip: null, daysAgo: 25, likes: 5, caption: "Danau yang kelihatan seperti laut. Aku cuma mampir, tetap kepikiran seminggu." },
  { author: 0, photo: 10, trip: 4, daysAgo: 26, likes: 4, caption: "Senja selatan. Trip pendek, langitnya tidak." },
  { author: 11, photo: 8, trip: null, daysAgo: 3, likes: 9, caption: "Danau Bratan, menara, dan satu motor yang tidak mau masuk frame." },
  { author: 2, photo: 15, trip: 10, daysAgo: 27, likes: 1, caption: "Pantai yang akan kubuka minggu depan. Ombaknya sudah latihan duluan." },
  { author: 7, photo: 14, trip: 17, daysAgo: 28, likes: 2, caption: "Ngarai hijau, airnya sampai betis, tertawa sampai pinggang." },
  { author: 14, photo: 5, trip: 23, daysAgo: 29, likes: 6, caption: "Bromo dari jalur yang tidak dijual paket online. Kabutnya tetap paket lengkap." },
  { author: 4, photo: 6, trip: null, daysAgo: 30, likes: 1, caption: "Nia lagi mengintip Rinjani dari foto orang. Nanti aku ikut beneran." },
  { author: 0, photo: 9, trip: null, daysAgo: 31, likes: 5, caption: "Satu terasering lagi. Aku janji ini yang terakhir bulan ini. Mungkin." },
  { author: 8, photo: 14, trip: null, daysAgo: 32, likes: 0, caption: "Canyon yang fotonya lebih rapi daripada titik jemputku." },
  { author: 12, photo: 2, trip: 13, daysAgo: 33, likes: 1, caption: "Leo cuma ikut. Kapalnya kecil, cakrawalanya tidak." },
  { author: 13, photo: 12, trip: null, daysAgo: 34, likes: 2, caption: "Danau Toba dari layar, belum dari bibir danau. Catatan pribadi Maya." },
  { author: 9, photo: 8, trip: null, daysAgo: 35, likes: 3, caption: "Pura yang selalu kelihatan seperti sudang-sudah kutunggu dari kemarin." },
];

const COMMENT_LINES = [
  "Ini jam berapa? Langitnya tidak sopan indahnya.",
  "Slot berikutnya kabari ya, aku ikut.",
  "Anginnya kelihatan dari cara rambutnya kabur.",
  "Warung di tikungan itu masih buka?",
  "Aku simpan buat itinerary bulan depan.",
  "Jangan dijelasin, nanti aku iri di kantor.",
  "Airnya kelihatan dingin. Tetap mau.",
  "Frame-nya rapi. Yang blur juga tetap ku-like.",
];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function demoUuid(kind, index) {
  const hex = crypto.createHash("sha256").update(`dolan-living15:${kind}:${index}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function dateOnly(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function stamp(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(8 + (daysAgo % 10), (daysAgo * 7) % 60, 0, 0);
  return d;
}

function photoUrl(index) {
  return PHOTOS[index % PHOTOS.length];
}

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const [existing] = await sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      { replacements: { email: `living01@${EMAIL_DOMAIN}` } },
    );
    if (existing.length) {
      console.log("[living-demo-users] living01 already present, skip");
      return;
    }

    const now = new Date();
    const passwordHash = hashPassword(DEMO_PASSWORD);
    const users = PEOPLE.map((person, index) => {
      const n = index + 1;
      return {
        id: demoUuid("user", n),
        auth_reference: `seed-living-${String(n).padStart(2, "0")}`,
        email: `living${String(n).padStart(2, "0")}@${EMAIL_DOMAIN}`,
        password_hash: passwordHash,
        role: "USER",
        status: "ACTIVE",
        email_verified_at: stamp(400 - index),
        created_at: stamp(400 - index),
        updated_at: now,
        person,
      };
    });

    await queryInterface.bulkInsert(
      "users",
      users.map(({ person: _person, ...row }) => row),
    );

    await queryInterface.bulkInsert(
      "user_profiles",
      users.map((user, index) => ({
        id: demoUuid("profile", index + 1),
        user_id: user.id,
        username: user.person.username,
        display_name: user.person.name,
        avatar_url: photoUrl(user.person.avatar),
        avatar_file_id: `living-avatar-${index + 1}`,
        cover_url: photoUrl(user.person.cover),
        cover_file_id: `living-cover-${index + 1}`,
        cover_caption: user.person.caption,
        bio: user.person.bio,
        domicile: user.person.domicile,
        instagram_url: user.person.instagram,
        tiktok_url: user.person.tiktok,
        created_at: user.created_at,
        updated_at: now,
      })),
    );

    const places = await loadPlaces(queryInterface, sequelize, now);
    const trips = [];
    const members = [];
    const joins = [];
    const versions = [];
    const days = [];
    const stops = [];
    const reviews = [];
    const notifications = [];
    let memberSeq = 0;
    let reviewSeq = 0;
    let notifSeq = 0;
    let joinSeq = 0;

    TRIPS.forEach((spec, tripIndex) => {
      const place = places[spec.place % places.length];
      const host = users[spec.host];
      const tripId = demoUuid("trip", tripIndex + 1);
      const versionId = demoUuid("version", tripIndex + 1);
      const dayId = demoUuid("day", tripIndex + 1);
      const start = dateOnly(spec.start);
      const end = dateOnly(spec.start + spec.days - 1);
      const createdAt = stamp(Math.max(2, -spec.start + 4));
      const title = spec.title(place);
      const party = 1 + spec.members.length;

      trips.push({
        id: tripId,
        host_user_id: host.id,
        title,
        description: spec.description,
        visibility: spec.visibility,
        status: spec.status,
        start_date: start,
        end_date: end,
        timezone: "Asia/Jakarta",
        private_origin_label: null,
        private_origin_latitude: null,
        private_origin_longitude: null,
        destination_city: place.city,
        public_meeting_point_label: spec.visibility === "PUBLIC" ? `Titik kumpul ${place.name}` : null,
        public_meeting_point_latitude: spec.visibility === "PUBLIC" ? place.lat : null,
        public_meeting_point_longitude: spec.visibility === "PUBLIC" ? place.lng : null,
        transport_mode: spec.transport,
        budget_amount: spec.budget,
        budget_basis: "PER_PERSON",
        currency: "IDR",
        planning_party_size: party,
        max_participants: Math.max(spec.max, party),
        current_itinerary_version_id: null,
        preferences: JSON.stringify({ pace: tripIndex % 2 === 0 ? "relaxed" : "packed" }),
        created_at: createdAt,
        updated_at: now,
      });

      memberSeq += 1;
      members.push(memberRow(memberSeq, tripId, host.id, "HOST", spec.status, createdAt, now));
      for (const participantIndex of spec.members) {
        if (participantIndex === spec.host) continue;
        memberSeq += 1;
        members.push(
          memberRow(memberSeq, tripId, users[participantIndex].id, "PARTICIPANT", spec.status, createdAt, now),
        );
      }

      for (const request of spec.joins ?? []) {
        joinSeq += 1;
        joins.push({
          id: demoUuid("join", joinSeq),
          trip_id: tripId,
          user_id: users[request.user].id,
          message: request.message,
          status: "PENDING",
          reviewed_by_user_id: null,
          reviewed_at: null,
          created_at: stamp(1),
          updated_at: now,
        });
        notifSeq += 1;
        notifications.push({
          id: demoUuid("notif", notifSeq),
          recipient_user_id: host.id,
          actor_user_id: users[request.user].id,
          type: "join_request.created",
          target_type: "TRIP",
          target_id: tripId,
          data: JSON.stringify({
            tripId,
            tripTitle: title,
            actorName: users[request.user].person.name,
            actorUsername: users[request.user].person.username,
          }),
          read_at: null,
          created_at: stamp(1),
          updated_at: now,
        });
      }

      versions.push({
        id: versionId,
        trip_id: tripId,
        version_number: 1,
        created_by_user_id: host.id,
        source: "MANUAL",
        summary: `Sehari di ${place.name}`,
        assumptions: JSON.stringify([]),
        created_at: createdAt,
        updated_at: now,
      });
      days.push({
        id: dayId,
        itinerary_version_id: versionId,
        day_number: 1,
        date: start,
        title: `Hari 1 · ${place.name}`,
        created_at: createdAt,
        updated_at: now,
      });
      stops.push({
        id: demoUuid("stop", tripIndex + 1),
        itinerary_day_id: dayId,
        place_id: place.id,
        sequence: 1,
        activity_type: "VISIT",
        custom_title: null,
        start_time: spec.status === "ONGOING" ? "03:30:00" : "08:30:00",
        duration_minutes: 90 + (tripIndex % 4) * 30,
        travel_duration_minutes: 20 + (tripIndex % 3) * 15,
        notes: spec.description,
        is_locked: false,
        created_at: createdAt,
        updated_at: now,
      });

      for (const [reviewer, reviewee, communication, attitude, comment] of spec.reviews) {
        if (reviewer === reviewee) continue;
        reviewSeq += 1;
        reviews.push({
          id: demoUuid("review", reviewSeq),
          trip_id: tripId,
          reviewer_user_id: users[reviewer].id,
          reviewee_user_id: users[reviewee].id,
          communication_rating: communication,
          attitude_rating: attitude,
          comment,
          moderation_status: "VISIBLE",
          created_at: stamp(Math.max(1, -spec.start - spec.days)),
          updated_at: now,
        });
      }

      if (spec.feedback) {
        const recipients = [spec.host, ...spec.members];
        for (const recipient of recipients) {
          notifSeq += 1;
          notifications.push({
            id: demoUuid("notif", notifSeq),
            recipient_user_id: users[recipient].id,
            actor_user_id: host.id,
            type: "feedback.invite",
            target_type: "TRIP",
            target_id: tripId,
            data: JSON.stringify({ tripId, tripTitle: title }),
            read_at: recipient === spec.host ? null : stamp(0),
            created_at: stamp(1),
            updated_at: now,
          });
        }
      }

      spec._tripId = tripId;
      spec._title = title;
    });

    const follows = [];
    const followSet = new Set();
    let followSeq = 0;
    const addFollow = (from, to) => {
      if (from === to) return;
      const key = `${from}:${to}`;
      if (followSet.has(key)) return;
      followSet.add(key);
      followSeq += 1;
      follows.push({
        id: demoUuid("follow", followSeq),
        follower_user_id: users[from].id,
        following_user_id: users[to].id,
        created_at: stamp(3 + (followSeq % 20)),
        updated_at: now,
      });
    };

    for (const follower of [1, 2, 5, 9, 14, 11, 7, 13, 8, 4, 12]) addFollow(follower, 0);
    for (const follower of [0, 1, 2, 4, 5, 6, 7, 8, 9, 11, 12, 13, 10]) addFollow(follower, 14);
    addFollow(4, 3);
    addFollow(11, 12);
    for (const following of [0, 1, 2, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14]) addFollow(12, following);
    for (let to = 0; to < users.length; to += 1) addFollow(4, to);
    for (const follower of [0, 2, 14, 9]) addFollow(follower, 1);
    for (const follower of [0, 7, 13]) addFollow(follower, 2);
    for (const follower of [1, 12, 14]) addFollow(follower, 5);
    for (const follower of [0, 1, 11]) addFollow(follower, 9);
    for (const follower of [0, 9, 14]) addFollow(follower, 11);
    addFollow(0, 7);
    addFollow(2, 8);
    addFollow(1, 6);
    addFollow(14, 6);
    addFollow(0, 13);
    addFollow(2, 10);
    addFollow(0, 12);

    for (const pair of [
      [4, 0],
      [14, 0],
      [11, 0],
    ]) {
      notifSeq += 1;
      notifications.push({
        id: demoUuid("notif", notifSeq),
        recipient_user_id: users[pair[1]].id,
        actor_user_id: users[pair[0]].id,
        type: "follower.created",
        target_type: "USER",
        target_id: users[pair[0]].id,
        data: JSON.stringify({
          actorName: users[pair[0]].person.name,
          actorUsername: users[pair[0]].person.username,
        }),
        read_at: pair[0] === 4 ? null : stamp(2),
        created_at: stamp(2),
        updated_at: now,
      });
    }

    const posts = POSTS.map((spec, index) => {
      const linked = spec.trip == null ? null : TRIPS[spec.trip];
      return {
        id: demoUuid("post", index + 1),
        author_user_id: users[spec.author].id,
        caption: spec.caption,
        image_url: photoUrl(spec.photo),
        image_file_id: `living-post-${index + 1}`,
        trip_id: linked?._tripId ?? null,
        template_id: null,
        deleted_at: null,
        created_at: stamp(spec.daysAgo),
        updated_at: now,
        spec,
      };
    });

    const likes = [];
    const comments = [];
    let likeSeq = 0;
    let commentSeq = 0;
    posts.forEach((post, postIndex) => {
      const picked = [];
      for (let step = 0; step < users.length && picked.length < post.spec.likes; step += 1) {
        const who = (postIndex * 3 + step + 1) % users.length;
        if (who === post.spec.author || picked.includes(who)) continue;
        picked.push(who);
        likeSeq += 1;
        likes.push({
          id: demoUuid("like", likeSeq),
          post_id: post.id,
          user_id: users[who].id,
          created_at: stamp(Math.max(0, post.spec.daysAgo - 1)),
          updated_at: now,
        });
      }
      const commentCount = post.spec.likes === 0 ? 0 : 1 + (postIndex % 4);
      for (let c = 0; c < commentCount && c < picked.length; c += 1) {
        const who = picked[c];
        commentSeq += 1;
        const body = COMMENT_LINES[(postIndex + c) % COMMENT_LINES.length];
        comments.push({
          id: demoUuid("comment", commentSeq),
          post_id: post.id,
          user_id: users[who].id,
          body,
          deleted_at: null,
          created_at: stamp(Math.max(0, post.spec.daysAgo - 1)),
          updated_at: now,
        });
        if (c === 0 && postIndex % 5 === 0) {
          notifSeq += 1;
          notifications.push({
            id: demoUuid("notif", notifSeq),
            recipient_user_id: post.author_user_id,
            actor_user_id: users[who].id,
            type: "post.commented",
            target_type: "post",
            target_id: post.id,
            data: JSON.stringify({
              postId: post.id,
              preview: body,
              actorName: users[who].person.name,
              actorUsername: users[who].person.username,
            }),
            read_at: postIndex === 0 ? null : stamp(1),
            created_at: stamp(Math.max(0, post.spec.daysAgo - 1)),
            updated_at: now,
          });
        }
      }
      if (picked[0] != null && (post.spec.author === 11 || postIndex % 7 === 0)) {
        notifSeq += 1;
        notifications.push({
          id: demoUuid("notif", notifSeq),
          recipient_user_id: post.author_user_id,
          actor_user_id: users[picked[0]].id,
          type: "post.liked",
          target_type: "post",
          target_id: post.id,
          data: JSON.stringify({
            postId: post.id,
            actorName: users[picked[0]].person.name,
            actorUsername: users[picked[0]].person.username,
          }),
          read_at: post.spec.author === 11 && post.spec.daysAgo < 5 ? null : stamp(1),
          created_at: stamp(Math.max(0, post.spec.daysAgo - 1)),
          updated_at: now,
        });
      }
    });

    await queryInterface.bulkInsert("trips", trips);
    await queryInterface.bulkInsert("trip_members", members);
    if (joins.length) await queryInterface.bulkInsert("trip_join_requests", joins);
    await queryInterface.bulkInsert("itinerary_versions", versions);
    await queryInterface.bulkInsert("itinerary_days", days);
    await queryInterface.bulkInsert("itinerary_stops", stops);
    for (let i = 0; i < trips.length; i += 1) {
      await sequelize.query(
        `UPDATE trips SET current_itinerary_version_id = :versionId, updated_at = :now WHERE id = :tripId`,
        { replacements: { versionId: versions[i].id, tripId: trips[i].id, now } },
      );
    }
    if (reviews.length) await queryInterface.bulkInsert("user_reviews", reviews);
    await queryInterface.bulkInsert(
      "posts",
      posts.map(({ spec: _spec, ...row }) => row),
    );
    if (likes.length) await queryInterface.bulkInsert("post_likes", likes);
    if (comments.length) await queryInterface.bulkInsert("post_comments", comments);
    await queryInterface.bulkInsert("user_follows", follows);
    if (notifications.length) await queryInterface.bulkInsert("notifications", notifications);

    console.log(
      `[living-demo-users] users=${users.length} trips=${trips.length} posts=${posts.length} follows=${follows.length} reviews=${reviews.length}`,
    );
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const userIds = PEOPLE.map((_, index) => demoUuid("user", index + 1));
    const tripIds = TRIPS.map((_, index) => demoUuid("trip", index + 1));
    const postIds = POSTS.map((_, index) => demoUuid("post", index + 1));
    const versionIds = TRIPS.map((_, index) => demoUuid("version", index + 1));
    const dayIds = TRIPS.map((_, index) => demoUuid("day", index + 1));

    await queryInterface.bulkDelete("post_comments", { post_id: postIds });
    await queryInterface.bulkDelete("post_likes", { post_id: postIds });
    await queryInterface.bulkDelete("posts", { id: postIds });
    await queryInterface.bulkDelete("notifications", { recipient_user_id: userIds });
    await queryInterface.bulkDelete("user_reviews", { reviewer_user_id: userIds });
    await queryInterface.bulkDelete("user_follows", { follower_user_id: userIds });
    await queryInterface.bulkDelete("trip_join_requests", { trip_id: tripIds });
    await sequelize.query(
      `UPDATE trips SET current_itinerary_version_id = NULL WHERE id IN (:tripIds)`,
      { replacements: { tripIds } },
    );
    await queryInterface.bulkDelete("itinerary_stops", { itinerary_day_id: dayIds });
    await queryInterface.bulkDelete("itinerary_days", { id: dayIds });
    await queryInterface.bulkDelete("itinerary_versions", { id: versionIds });
    await queryInterface.bulkDelete("trip_members", { trip_id: tripIds });
    await queryInterface.bulkDelete("trips", { id: tripIds });
    await sequelize.query(`DELETE FROM places WHERE google_place_id LIKE 'living-demo-%'`);
    await queryInterface.bulkDelete("user_profiles", { user_id: userIds });
    await queryInterface.bulkDelete("users", { id: userIds });
  },
};

function memberRow(seq, tripId, userId, role, status, createdAt, now) {
  const confirmed = status === "COMPLETED";
  return {
    id: demoUuid("member", seq),
    trip_id: tripId,
    user_id: userId,
    role,
    membership_status: "ACTIVE",
    host_attendance: confirmed ? "PRESENT" : "UNCONFIRMED",
    self_attendance: confirmed ? "PRESENT" : "UNCONFIRMED",
    show_on_profile: true,
    joined_at: createdAt,
    left_at: null,
    created_at: createdAt,
    updated_at: now,
  };
}

async function loadPlaces(queryInterface, sequelize, now) {
  const [rows] = await sequelize.query(
    `SELECT id, cached_name AS name, cached_city AS city, cached_latitude AS lat, cached_longitude AS lng, cached_photo_url
     FROM places
     WHERE status = 'ACTIVE' AND cached_name IS NOT NULL
     ORDER BY created_at ASC
     LIMIT 8`,
  );
  const places = rows.map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city || row.name,
    lat: row.lat,
    lng: row.lng,
    photo: row.cached_photo_url,
  }));

  const missing = FALLBACK_PLACES.slice(places.length);
  if (missing.length) {
    const inserted = missing.map((place, offset) => {
      const index = places.length + offset + 1;
      return {
        id: demoUuid("place", index),
        google_place_id: `living-demo-${place.key}`,
        cached_name: place.name,
        cached_city: place.city,
        cached_latitude: place.lat,
        cached_longitude: place.lng,
        cache_checked_at: now,
        status: "ACTIVE",
        cached_photo_url: photoUrl(place.photo),
        cached_photo_name: `living-${place.key}`,
        cached_photo_attribution: "Wikimedia Commons",
        created_at: now,
        updated_at: now,
      };
    });
    await queryInterface.bulkInsert("places", inserted);
    for (const row of inserted) {
      places.push({
        id: row.id,
        name: row.cached_name,
        city: row.cached_city,
        lat: row.cached_latitude,
        lng: row.cached_longitude,
        photo: row.cached_photo_url,
      });
    }
  }

  for (let i = 0; i < places.length; i += 1) {
    if (places[i].photo) continue;
    const url = photoUrl(FALLBACK_PLACES[i]?.photo ?? i);
    await sequelize.query(
      `UPDATE places
       SET cached_photo_url = :url,
           cached_photo_name = :name,
           cached_photo_attribution = :credit,
           updated_at = :now
       WHERE id = :id AND cached_photo_url IS NULL`,
      {
        replacements: {
          url,
          name: `living-fill-${i + 1}`,
          credit: "Wikimedia Commons",
          now,
          id: places[i].id,
        },
      },
    );
    places[i].photo = url;
  }

  return places;
}

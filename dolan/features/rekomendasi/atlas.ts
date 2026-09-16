export type AtlasProvince = {
  slug: string;
  name: string;
  capital: string;
  place: string;
  teaser: string;
};

export const PROVINCE_ATLAS: AtlasProvince[] = [
  { slug: "aceh", name: "Aceh", capital: "Banda Aceh", place: "Masjid Raya Baiturrahman", teaser: "Ujung barat Indonesia: masjid putih, pantai Lampuuk, dan Pulau Weh." },
  { slug: "sumatera-utara", name: "Sumatera Utara", capital: "Medan", place: "Danau Toba", teaser: "Kaldera raksasa, Istana Maimun, dan kopi di kaki bukit Samosir." },
  { slug: "sumatera-barat", name: "Sumatera Barat", capital: "Padang", place: "Jam Gadang", teaser: "Nasi Padang, ngarai Sianok, dan rumah gadang di Bukittinggi." },
  { slug: "riau", name: "Riau", capital: "Pekanbaru", place: "Istana Siak", teaser: "Istana Siak, sungai, dan jalan lintas menuju pedalaman." },
  { slug: "kepulauan-riau", name: "Kepulauan Riau", capital: "Tanjungpinang", place: "Jembatan Barelang", teaser: "Barelang, Bintan, dan perbatasan laut Singapura." },
  { slug: "jambi", name: "Jambi", capital: "Jambi", place: "Candi Muaro Jambi", teaser: "Kompleks candi di tepi Batanghari, masih sepi dari keramaian." },
  { slug: "sumatera-selatan", name: "Sumatera Selatan", capital: "Palembang", place: "Jembatan Ampera", teaser: "Ampera di atas Musi, pempek, dan jejak Sriwijaya di Palembang." },
  { slug: "kepulauan-bangka-belitung", name: "Kep. Bangka Belitung", capital: "Pangkalpinang", place: "Pantai Tanjung Tinggi", teaser: "Granit raksasa, laut jernih, dan pulau-pulau kecil di Belitung." },
  { slug: "bengkulu", name: "Bengkulu", capital: "Bengkulu", place: "Benteng Marlborough", teaser: "Benteng Inggris, Pantai Panjang, dan kopi di kaki Bukit Barisan." },
  { slug: "lampung", name: "Lampung", capital: "Bandar Lampung", place: "Krakatau", teaser: "Anak Krakatau, gong Way Sekampung, dan pintu masuk ke Sumatera." },
  { slug: "dki-jakarta", name: "DKI Jakarta", capital: "Jakarta", place: "Monas", teaser: "Ibu kota yang tidak tidur: kota tua, kuliner malam, dan Monas." },
  { slug: "banten", name: "Banten", capital: "Serang", place: "Ujung Kulon", teaser: "Ujung Kulon, Anyer, dan jejak badak Jawa yang liar." },
  { slug: "jawa-barat", name: "Jawa Barat", capital: "Bandung", place: "Kawah Putih", teaser: "Bandung dingin, kawah, dan pantai selatan yang berombak besar." },
  { slug: "jawa-tengah", name: "Jawa Tengah", capital: "Semarang", place: "Borobudur", teaser: "Borobudur di pagi hari, Kota Lama Semarang, dan Dieng." },
  { slug: "di-yogyakarta", name: "DI Yogyakarta", capital: "Yogyakarta", place: "Prambanan", teaser: "Prambanan, Malioboro, dan keraton di jantung Jawa." },
  { slug: "jawa-timur", name: "Jawa Timur", capital: "Surabaya", place: "Gunung Bromo", teaser: "Bromo saat fajar, Ijen yang biru, dan Surabaya yang sibuk." },
  { slug: "bali", name: "Bali", capital: "Denpasar", place: "Tanah Lot", teaser: "Pura di laut, sawah Ubud, dan matahari terbenam di Tanah Lot." },
  { slug: "nusa-tenggara-barat", name: "Nusa Tenggara Barat", capital: "Mataram", place: "Gunung Rinjani", teaser: "Rinjani, gili-gili, dan pantai pink di sisi Lombok." },
  { slug: "nusa-tenggara-timur", name: "Nusa Tenggara Timur", capital: "Kupang", place: "Pulau Padar", teaser: "Padar, Komodo, dan savana yang kering di ujung tenggara." },
  { slug: "kalimantan-barat", name: "Kalimantan Barat", capital: "Pontianak", place: "Tugu Khatulistiwa", teaser: "Khatulistiwa, sungai Kapuas, dan rumah panjang di pedalaman." },
  { slug: "kalimantan-tengah", name: "Kalimantan Tengah", capital: "Palangka Raya", place: "Tanjung Puting", teaser: "Orangutan di Tanjung Puting dan kelotok di sungai hitam." },
  { slug: "kalimantan-selatan", name: "Kalimantan Selatan", capital: "Banjarmasin", place: "Pasar terapung", teaser: "Pasar terapung subuh, rakit, dan kuliner Banjar di tepi sungai." },
  { slug: "kalimantan-timur", name: "Kalimantan Timur", capital: "Samarinda", place: "Kepulauan Derawan", teaser: "Derawan, penyu, dan ibu kota baru yang sedang tumbuh." },
  { slug: "kalimantan-utara", name: "Kalimantan Utara", capital: "Tanjung Selor", place: "Islamic Centre Tarakan", teaser: "Tarakan, pulau perbatasan, dan hutan yang masih rapat." },
  { slug: "sulawesi-utara", name: "Sulawesi Utara", capital: "Manado", place: "Bunaken", teaser: "Bunaken di bawah laut, Bunaken di atas piring: cakalang dan rica." },
  { slug: "gorontalo", name: "Gorontalo", capital: "Gorontalo", place: "Benteng Otanaha", teaser: "Otanaha di atas teluk, Olele yang jernih, dan kota yang sepi." },
  { slug: "sulawesi-tengah", name: "Sulawesi Tengah", capital: "Palu", place: "Pantai Labuana", teaser: "Pantai Donggala, Togean, dan teluk yang membelah pulau." },
  { slug: "sulawesi-barat", name: "Sulawesi Barat", capital: "Mamuju", place: "Rumah adat Mamuju", teaser: "Rumah adat Mamuju, Pantai Manakarra, dan jalan baru ke utara." },
  { slug: "sulawesi-selatan", name: "Sulawesi Selatan", capital: "Makassar", place: "Tana Toraja", teaser: "Toraja di atas kabut, Losari di senja, dan perahu phinisi." },
  { slug: "sulawesi-tenggara", name: "Sulawesi Tenggara", capital: "Kendari", place: "Desa Bajo Wakatobi", teaser: "Rumah atas air Suku Bajo, atoll, dan taman laut Wakatobi." },
  { slug: "maluku", name: "Maluku", capital: "Ambon", place: "Kepulauan Banda", teaser: "Banda, pala, dan laut yang pernah mengubah peta dunia." },
  { slug: "maluku-utara", name: "Maluku Utara", capital: "Sofifi", place: "Ternate", teaser: "Gunung Gamalama, kesultanan Ternate, dan laut di antara pulau." },
  { slug: "papua-barat", name: "Papua Barat", capital: "Manokwari", place: "Pegunungan Arfak", teaser: "Arfak, Cenderawasih, dan teluk yang masih jarang dijejaki." },
  { slug: "papua-barat-daya", name: "Papua Barat Daya", capital: "Sorong", place: "Piaynemo", teaser: "Karst Piaynemo, Wayag, dan air Raja Ampat yang kelihatan dari angkasa." },
  { slug: "papua", name: "Papua", capital: "Jayapura", place: "Danau Sentani", teaser: "Sentani, Taman Nasional Cyclops, dan kota di tepi Pasifik." },
  { slug: "papua-selatan", name: "Papua Selatan", capital: "Merauke", place: "Taman Nasional Wasur", teaser: "Wasur, savana, dan ujung timur daratan Indonesia." },
  { slug: "papua-tengah", name: "Papua Tengah", capital: "Nabire", place: "Danau Paniai", teaser: "Danau Paniai, Nabire, dan jalan menuju pegunungan tengah." },
  { slug: "papua-pegunungan", name: "Papua Pegunungan", capital: "Wamena", place: "Honai Lembah Baliem", teaser: "Honai, lembah Baliem, dan pagi yang dingin di ketinggian." },
];

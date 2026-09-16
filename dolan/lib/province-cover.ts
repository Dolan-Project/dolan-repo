import type { CuratedProvince } from "@/lib/provinces";

const WM = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1600`;

const BY_SLUG: Record<string, string> = {
  aceh: WM("Meuseujid Raya Baiturrahman .jpg"),
  "sumatera-utara": WM("Lake Toba and the surrounding hills.jpg"),
  "sumatera-barat": WM("Jam Gadang, Bukittinggi, 2016-02-12 01.jpg"),
  riau: WM("Istana Kerajaan Siak (2).jpg"),
  "kepulauan-riau": WM("Jembatan Tengku Fisabilillah (jembatan I).jpg"),
  jambi: WM("Candi Muaro Jambi dengan langit biru.jpg"),
  "sumatera-selatan": WM("Jembatan Ampera at night.JPG"),
  "kepulauan-bangka-belitung": WM("Tanjung Tinggi Beach, Bangka-Belitung Province, Indonesia.jpg"),
  bengkulu: WM("Front gate of Fort Marlborough, Bengkulu 2015-04-19 02.jpg"),
  lampung: WM("Anak Krakatau.jpg"),
  "dki-jakarta": WM("Monas Jakarta.jpg"),
  banten: WM("Ujung Kulon National Park, 2014.jpg"),
  "jawa-barat": WM("Kawah Putih Lake from the viewing platform, Bandung Regency, 2014-08-21.jpg"),
  "jawa-tengah": WM("Borobudur.jpg"),
  "di-yogyakarta": WM("Prambanan Temple Yogyakarta Indonesia.jpg"),
  "jawa-timur": WM("Mount Bromo at sunrise, showing its volcanoes and Mount Semeru (background).jpg"),
  bali: WM("TanahLot 2014.JPG"),
  "nusa-tenggara-barat": WM("Mount Rinjani.jpg"),
  "nusa-tenggara-timur": WM("Pulau Padar 1.jpg"),
  "kalimantan-barat": WM("Eksterior Tugu Khatulistiwa Pontianak (2026).jpg"),
  "kalimantan-tengah": WM("Win the Orangutang in Tanjung Puting National Park 2005.jpg"),
  "kalimantan-selatan": WM("Jukung Pasar Terapung.jpg"),
  "kalimantan-timur": WM("Derawan Island East Kalimantan.jpg"),
  "kalimantan-utara": WM("Islamic Centre Kota Tarakan.JPG"),
  "sulawesi-utara": WM("Bunaken.jpg"),
  gorontalo: WM("Otanaha Fortress.JPG"),
  "sulawesi-tengah": WM("Pantai Labuana.jpg"),
  "sulawesi-barat": WM("Rumah Adat Mamuju.jpg"),
  "sulawesi-selatan": WM("Tongkonan Toraja.jpg"),
  "sulawesi-tenggara": WM("Reflection of Floating House of Bajau in Bajau Sampela Village Wakatobi.jpg"),
  maluku: WM("Northside of Banda Neira from Gunung Api Banda.jpg"),
  "maluku-utara": WM("The peak of Mount Gamalama, Ternate.jpg"),
  "papua-barat": WM("Arfak Mountains.jpg"),
  "papua-barat-daya": WM("Piaynemo Raja Ampat.jpg"),
  papua: WM("Sentani lake.jpg"),
  "papua-selatan": WM("Melaleuca.Sp lahan basah TN Wasur.jpg"),
  "papua-tengah": WM("Danau Paniai.jpg"),
  "papua-pegunungan": WM("Dani people traditional house near Wamena, Papua, Indonesia 01.jpg"),
};

export function provinceCoverUrl(province: Pick<CuratedProvince, "slug" | "name" | "heroQuery">) {
  if (BY_SLUG[province.slug]) return BY_SLUG[province.slug]!;
  const tag = encodeURIComponent((province.heroQuery || `${province.name}, Indonesia`).split(",")[0]!.trim());
  return `https://loremflickr.com/1400/800/${tag},indonesia,travel`;
}

export function provinceHref(slug: string) {
  return `/provinsi/${slug}`;
}

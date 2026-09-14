import { ASSETS } from "@/lib/assets";
import type { CuratedProvince } from "@/lib/provinces";

const UNSPLASH = (id: string, extra = "") =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80${extra}`;

const BY_SLUG: Record<string, string> = {
  aceh: UNSPLASH("photo-1596402184320-417e7178b2cd", "&sig=aceh-mosque"),
  "sumatera-utara": UNSPLASH("photo-1528127269322-539801943592", "&sig=danau-toba"),
  "sumatera-barat": UNSPLASH("photo-1501785888041-af3ee517b9c2", "&sig=jam-gadang"),
  riau: UNSPLASH("photo-1469474968028-56623f02e42e", "&sig=riau"),
  "kepulauan-riau": UNSPLASH("photo-1507525428034-b723cf961d3e", "&sig=bintan"),
  jambi: UNSPLASH("photo-1483683804023-6ccdb62f86ef", "&sig=jambi"),
  "sumatera-selatan": UNSPLASH("photo-1476514525535-07fb3b4ae5f1", "&sig=ampera"),
  "kepulauan-bangka-belitung": UNSPLASH("photo-1507525428034-b723cf961d3e", "&sig=belitung"),
  bengkulu: UNSPLASH("photo-1501785888041-af3ee517b9c2", "&sig=bengkulu"),
  lampung: UNSPLASH("photo-1518548419970-58e3b4079ab2", "&sig=krakatau"),
  "dki-jakarta": UNSPLASH("photo-1555899434-94d10b8c0b5a", "&sig=monas-jakarta"),
  "jawa-barat": UNSPLASH("photo-1555899434-94d10b8c0b5a", "&sig=bandung"),
  banten: UNSPLASH("photo-1507525428034-b723cf961d3e", "&sig=anyer"),
  "jawa-tengah": UNSPLASH("photo-1596402184320-417e7178b2cd", "&sig=borobudur"),
  "di-yogyakarta": ASSETS.jogja,
  "jawa-timur": UNSPLASH("photo-1588668214407-6ea9a6d8c272", "&sig=gunung-bromo"),
  bali: ASSETS.tanahLot,
  "nusa-tenggara-barat": UNSPLASH("photo-1573790387438-4da905039392", "&sig=lombok-rinjani"),
  "nusa-tenggara-timur": ASSETS.komodo,
  "kalimantan-barat": UNSPLASH("photo-1528127269322-539801943592", "&sig=pontianak"),
  "kalimantan-tengah": UNSPLASH("photo-1516691365376-dfdf5ac3f31b", "&sig=tanjung-puting"),
  "kalimantan-selatan": UNSPLASH("photo-1469474968028-56623f02e42e", "&sig=banjarmasin"),
  "kalimantan-timur": UNSPLASH("photo-1507525428034-b723cf961d3e", "&sig=derawan"),
  "kalimantan-utara": UNSPLASH("photo-1516691365376-dfdf5ac3f31b", "&sig=tarakan"),
  "sulawesi-utara": UNSPLASH("photo-1537996194471-e657df975ab4", "&sig=bunaken"),
  gorontalo: UNSPLASH("photo-1507525428034-b723cf961d3e", "&sig=gorontalo"),
  "sulawesi-tengah": UNSPLASH("photo-1573790387438-4da905039392", "&sig=togean"),
  "sulawesi-barat": UNSPLASH("photo-1483683804023-6ccdb62f86ef", "&sig=mamuju"),
  "sulawesi-selatan": UNSPLASH("photo-1596402184320-417e7178b2cd", "&sig=toraja"),
  "sulawesi-tenggara": UNSPLASH("photo-1537996194471-e657df975ab4", "&sig=wakatobi"),
  maluku: UNSPLASH("photo-1507525428034-b723cf961d3e", "&sig=banda"),
  "maluku-utara": UNSPLASH("photo-1518548419970-58e3b4079ab2", "&sig=ternate"),
  "papua-barat": UNSPLASH("photo-1516691365376-dfdf5ac3f31b", "&sig=manokwari"),
  "papua-barat-daya": UNSPLASH("photo-1516691365376-dfdf5ac3f31b", "&sig=raja-ampat"),
  papua: UNSPLASH("photo-1528127269322-539801943592", "&sig=jayapura"),
  "papua-selatan": UNSPLASH("photo-1469474968028-56623f02e42e", "&sig=merauke"),
  "papua-tengah": UNSPLASH("photo-1516691365376-dfdf5ac3f31b", "&sig=nabire"),
  "papua-pegunungan": UNSPLASH("photo-1501785888041-af3ee517b9c2", "&sig=baliem"),
};

export function provinceCoverUrl(province: Pick<CuratedProvince, "slug" | "name" | "heroQuery">) {
  if (BY_SLUG[province.slug]) return BY_SLUG[province.slug]!;
  const tag = encodeURIComponent((province.heroQuery || `${province.name}, Indonesia`).split(",")[0]!.trim());
  return `https://loremflickr.com/1400/800/${tag},indonesia,travel`;
}

export function provinceHref(slug: string) {
  return `/provinsi/${slug}`;
}

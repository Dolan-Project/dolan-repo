export const ISLAND_GROUPS = [
  {
    id: "sumatera",
    label: "Sumatera",
    line: "Ujung barat, danau, dan selat yang berasap",
    slugs: [
      "aceh",
      "sumatera-utara",
      "sumatera-barat",
      "riau",
      "kepulauan-riau",
      "jambi",
      "sumatera-selatan",
      "kepulauan-bangka-belitung",
      "bengkulu",
      "lampung",
    ],
  },
  {
    id: "jawa",
    label: "Jawa",
    line: "Candi, kota, dan gunung yang selalu ramai",
    slugs: [
      "dki-jakarta",
      "banten",
      "jawa-barat",
      "jawa-tengah",
      "di-yogyakarta",
      "jawa-timur",
    ],
  },
  {
    id: "nusa",
    label: "Bali & Nusa Tenggara",
    line: "Pura di laut, Rinjani, dan komodo",
    slugs: ["bali", "nusa-tenggara-barat", "nusa-tenggara-timur"],
  },
  {
    id: "kalimantan",
    label: "Kalimantan",
    line: "Sungai, hutan, dan pesisir Derawan",
    slugs: [
      "kalimantan-barat",
      "kalimantan-tengah",
      "kalimantan-selatan",
      "kalimantan-timur",
      "kalimantan-utara",
    ],
  },
  {
    id: "sulawesi",
    label: "Sulawesi",
    line: "Bunaken, Toraja, Wakatobi",
    slugs: [
      "sulawesi-utara",
      "gorontalo",
      "sulawesi-tengah",
      "sulawesi-barat",
      "sulawesi-selatan",
      "sulawesi-tenggara",
    ],
  },
  {
    id: "timur",
    label: "Maluku & Papua",
    line: "Ujung timur yang masih jarang dijejaki",
    slugs: [
      "maluku",
      "maluku-utara",
      "papua-barat",
      "papua-barat-daya",
      "papua",
      "papua-selatan",
      "papua-tengah",
      "papua-pegunungan",
    ],
  },
] as const;

export type IslandId = (typeof ISLAND_GROUPS)[number]["id"] | "semua";

export const FEATURED_SLUGS = [
  "bali",
  "nusa-tenggara-timur",
  "di-yogyakarta",
  "papua-barat-daya",
  "jawa-timur",
] as const;

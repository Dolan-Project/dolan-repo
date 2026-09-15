export type LatLng = { lat: number; lng: number };

/** Real-world coordinates for catalog stops (not province capitals). */
export const PLACE_COORDINATES: Record<string, LatLng> = {
  "masjid raya baiturrahman": { lat: 5.5535, lng: 95.3173 },
  "museum tsunami aceh": { lat: 5.5478, lng: 95.3151 },
  "pantai lampuuk": { lat: 5.4812, lng: 95.2348 },
  "pulau weh": { lat: 5.875, lng: 95.32 },
  "danau laut tawar": { lat: 4.644, lng: 96.924 },

  "danau toba": { lat: 2.611, lng: 98.807 },
  "pulau samosir": { lat: 2.585, lng: 98.82 },
  "istana maimun": { lat: 3.5751, lng: 98.6837 },
  "air terjun sipiso-piso": { lat: 2.9165, lng: 98.519 },
  "bukit lawang": { lat: 3.545, lng: 98.122 },

  "jam gadang": { lat: -0.3056, lng: 100.3695 },
  "ngarai sianok": { lat: -0.304, lng: 100.364 },
  "lembah harau": { lat: -0.111, lng: 100.666 },
  "istano basa pagaruyung": { lat: -0.471, lng: 100.621 },
  "kepulauan mentawai": { lat: -2.1, lng: 99.65 },

  "istana siak sri indrapura": { lat: 0.796, lng: 102.049 },
  "candi muara takus": { lat: 0.336, lng: 100.642 },
  "danau raja": { lat: 0.346, lng: 101.027 },
  "taman nasional tesso nilo": { lat: -0.12, lng: 101.87 },
  "riau fantasi": { lat: 0.469, lng: 101.455 },

  "pulau penyengat": { lat: 0.928, lng: 104.418 },
  "lagoi bay": { lat: 1.18, lng: 104.39 },
  "pantai trikora": { lat: 1.0, lng: 104.58 },
  "gurun pasir busung": { lat: 1.02, lng: 104.48 },
  "jembatan barelang": { lat: 1.048, lng: 104.052 },

  "candi muaro jambi": { lat: -1.478, lng: 103.667 },
  "gentala arasy": { lat: -1.5916, lng: 103.6115 },
  "masjid agung al-falah jambi": { lat: -1.5903, lng: 103.615 },
  "museum siginjai": { lat: -1.6105, lng: 103.6138 },
  "taman rimbo jambi": { lat: -1.618, lng: 103.604 },
  "kebun teh kayu aro": { lat: -1.78, lng: 101.264 },
  "air terjun telun berasap": { lat: -1.849, lng: 101.37 },
  "gunung kerinci": { lat: -1.697, lng: 101.264 },
  "danau kaco": { lat: -2.118, lng: 101.96 },
  "geopark merangin": { lat: -2.18, lng: 102.14 },
  "danau gunung tujuh": { lat: -1.711, lng: 101.41 },

  "jembatan ampera": { lat: -2.9917, lng: 104.7634 },
  "pulau kemaro": { lat: -2.978, lng: 104.8 },
  "benteng kuto besak": { lat: -2.992, lng: 104.761 },
  "gunung dempo": { lat: -4.015, lng: 103.128 },
  "danau ranau": { lat: -4.83, lng: 103.93 },

  "pantai tanjung tinggi": { lat: -2.551, lng: 107.71 },
  "pulau lengkuas": { lat: -2.542, lng: 107.615 },
  "danau kaolin": { lat: -2.12, lng: 106.11 },
  "pantai parai tenggiri": { lat: -1.86, lng: 106.12 },
  "museum kata andrea hirata": { lat: -2.74, lng: 107.63 },

  "benteng marlborough": { lat: -3.787, lng: 102.252 },
  "pantai panjang": { lat: -3.815, lng: 102.28 },
  "rumah pengasingan bung karno": { lat: -3.797, lng: 102.261 },
  "danau dendam tak sudah": { lat: -3.78, lng: 102.32 },
  "pulau enggano": { lat: -5.4, lng: 102.27 },

  "taman nasional way kambas": { lat: -4.92, lng: 105.75 },
  "pulau pahawang": { lat: -5.673, lng: 105.217 },
  "dermaga ketapang pahawang": { lat: -5.56, lng: 105.26 },
  "teluk kiluan": { lat: -5.78, lng: 105.1 },
  "pantai gigi hiu": { lat: -5.8, lng: 104.9 },
  "pantai kelawi": { lat: -5.79, lng: 105.05 },
  "pantai mutun": { lat: -5.512, lng: 105.262 },
  "lampung walk": { lat: -5.429, lng: 105.261 },
  "museum lampung": { lat: -5.418, lng: 105.261 },
  "puncak mas lampung": { lat: -5.428, lng: 105.239 },
  "taman gajah lampung": { lat: -5.425, lng: 105.258 },
  "pusat konservasi gajah way kambas": { lat: -4.93, lng: 105.78 },
  "gunung anak krakatau": { lat: -6.102, lng: 105.423 },

  "monumen nasional": { lat: -6.1754, lng: 106.8272 },
  "kota tua jakarta": { lat: -6.1352, lng: 106.8133 },
  "museum macan": { lat: -6.1907, lng: 106.767 },
  "taman mini indonesia indah": { lat: -6.3024, lng: 106.8901 },
  "kepulauan seribu": { lat: -5.74, lng: 106.55 },

  "kawah putih": { lat: -7.1662, lng: 107.4021 },
  "tangkuban perahu": { lat: -6.7596, lng: 107.6097 },
  "kebun raya bogor": { lat: -6.5971, lng: 106.799 },
  "green canyon pangandaran": { lat: -7.735, lng: 108.46 },
  "situ patenggang": { lat: -7.1608, lng: 107.3575 },
  "gedung sate": { lat: -6.9025, lng: 107.6187 },
  "jalan braga": { lat: -6.9174, lng: 107.609 },
  "tebing keraton": { lat: -6.8352, lng: 107.663 },
  "museum geologi bandung": { lat: -6.9007, lng: 107.6191 },
  "alun-alun bandung": { lat: -6.9218, lng: 107.6071 },
  "cihampelas walk": { lat: -6.8956, lng: 107.6046 },
  "saung angklung udjo": { lat: -6.8978, lng: 107.6553 },
  "jalan asia afrika": { lat: -6.9212, lng: 107.6097 },
  "istana bogor": { lat: -6.598, lng: 106.7994 },
  "taman kencana bogor": { lat: -6.5938, lng: 106.7965 },
  "jalan suryakencana": { lat: -6.6035, lng: 106.7998 },
  "alun-alun kidul": { lat: -7.8117, lng: 110.3635 },
  "tugu yogyakarta": { lat: -7.7829, lng: 110.3671 },
  "bundaran hi": { lat: -6.1944, lng: 106.8229 },
  ancol: { lat: -6.1256, lng: 106.8333 },
  glodok: { lat: -6.1445, lng: 106.8147 },
  "masjid istiqlal": { lat: -6.1702, lng: 106.8314 },
  "museum nasional": { lat: -6.176, lng: 106.8216 },
  "taman menteng": { lat: -6.1967, lng: 106.8305 },
  "gelora bung karno": { lat: -6.2183, lng: 106.8027 },
  "lautan pasir bromo": { lat: -7.935, lng: 112.955 },
  "cemoro lawang": { lat: -7.942, lng: 112.964 },
  "savana teletubbies bromo": { lat: -7.925, lng: 112.973 },
  "trans studio bandung": { lat: -6.9252, lng: 107.6365 },
  "taman lansia bandung": { lat: -6.8985, lng: 107.625 },
  "museum zoologi bogor": { lat: -6.5986, lng: 106.7968 },
  "taman sempur": { lat: -6.5894, lng: 106.7972 },
  "pasar beringharjo": { lat: -7.7989, lng: 110.3656 },
  "titik nol km yogyakarta": { lat: -7.8014, lng: 110.3647 },
  "taman pintar yogyakarta": { lat: -7.8006, lng: 110.3677 },

  "taman nasional ujung kulon": { lat: -6.75, lng: 105.33 },
  "pantai anyer": { lat: -6.09, lng: 105.88 },
  "pulau peucang": { lat: -6.73, lng: 105.26 },
  "baduy dalam": { lat: -6.48, lng: 106.22 },
  "tanjung lesung": { lat: -6.48, lng: 105.66 },

  "candi borobudur": { lat: -7.6079, lng: 110.2038 },
  "dataran tinggi dieng": { lat: -7.209, lng: 109.908 },
  "lawang sewu": { lat: -6.984, lng: 110.4108 },
  "karimunjawa": { lat: -5.818, lng: 110.46 },
  "candi prambanan": { lat: -7.752, lng: 110.4915 },
  "kawah sikidang": { lat: -7.2201, lng: 109.9054 },
  "candi arjuna": { lat: -7.2058, lng: 109.9074 },
  "bukit sikunir": { lat: -7.2351, lng: 109.9242 },
  "pelabuhan karimunjawa": { lat: -5.8841, lng: 110.4419 },
  "pantai tanjung gelam": { lat: -5.8388, lng: 110.3978 },
  "bukit love": { lat: -5.8703, lng: 110.4344 },

  "jalan malioboro": { lat: -7.7926, lng: 110.3658 },
  "keraton yogyakarta": { lat: -7.8053, lng: 110.3642 },
  "taman sari": { lat: -7.81, lng: 110.3594 },
  "pantai parangtritis": { lat: -8.025, lng: 110.329 },
  "tebing breksi": { lat: -7.782, lng: 110.504 },

  "gunung bromo": { lat: -7.9425, lng: 112.953 },
  "penanjakan bromo": { lat: -7.9083, lng: 112.9468 },
  "madakaripura": { lat: -7.8538, lng: 113.0064 },
  "kawah ijen": { lat: -8.058, lng: 114.242 },
  "tumpak sewu": { lat: -8.2303, lng: 112.9167 },
  "taman nasional baluran": { lat: -7.85, lng: 114.37 },
  "pantai papuma": { lat: -8.431, lng: 113.553 },

  "pura tanah lot": { lat: -8.621, lng: 115.0868 },
  "tanah lot": { lat: -8.621, lng: 115.0868 },
  "tegallalang rice terrace": { lat: -8.431, lng: 115.279 },
  "pura uluwatu": { lat: -8.8291, lng: 115.0849 },
  uluwatu: { lat: -8.8291, lng: 115.0849 },
  "nusa penida": { lat: -8.7275, lng: 115.5444 },
  "gunung batur": { lat: -8.242, lng: 115.375 },

  "gunung rinjani": { lat: -8.411, lng: 116.457 },
  "gili trawangan": { lat: -8.348, lng: 116.037 },
  "pantai kuta mandalika": { lat: -8.9, lng: 116.3 },
  "desa sade": { lat: -8.85, lng: 116.3 },
  "air terjun tiu kelep": { lat: -8.3, lng: 116.42 },
  "desa sembalun": { lat: -8.3614, lng: 116.5306 },
  "plawangan sembalun": { lat: -8.3831, lng: 116.4512 },
  "danau segara anak": { lat: -8.4075, lng: 116.4161 },

  "pulau padar": { lat: -8.6486, lng: 119.5892 },
  "taman nasional komodo": { lat: -8.55, lng: 119.49 },
  "danau kelimutu": { lat: -8.768, lng: 121.808 },
  "desa wae rebo": { lat: -8.85, lng: 120.3 },
  "pantai pink labuan bajo": { lat: -8.6031, lng: 119.5196 },
  "pink beach": { lat: -8.6031, lng: 119.5196 },
  "manta point": { lat: -8.5374, lng: 119.6161 },

  "tugu khatulistiwa": { lat: 0.0, lng: 109.322 },
  "danau sentarum": { lat: 0.85, lng: 112.1 },
  "bukit kelam": { lat: 0.07, lng: 111.64 },
  "pantai temajuk": { lat: 2.0, lng: 109.58 },
  "keraton kadriah": { lat: -0.027, lng: 109.341 },

  "taman nasional tanjung puting": { lat: -2.82, lng: 111.83 },
  "bukit tangkiling": { lat: -1.89, lng: 113.81 },
  "danau tahai": { lat: -2.02, lng: 113.85 },
  "taman nasional sebangau": { lat: -2.55, lng: 113.85 },
  "sungai kahayan": { lat: -2.21, lng: 113.92 },

  "pasar terapung lok baintan": { lat: -3.3, lng: 114.7 },
  "bukit matang kaladan": { lat: -3.0, lng: 115.0 },
  loksado: { lat: -2.8, lng: 115.5 },
  "pulau kembang": { lat: -3.29, lng: 114.58 },
  "tahura sultan adam": { lat: -3.45, lng: 114.85 },

  "kepulauan derawan": { lat: 2.283, lng: 118.25 },
  "pulau maratua": { lat: 2.23, lng: 118.58 },
  "danau labuan cermin": { lat: 1.47, lng: 118.0 },
  "desa budaya pampang": { lat: -0.4, lng: 117.2 },
  "bukit bangkirai": { lat: -0.99, lng: 116.87 },

  "taman nasional kayan mentarang": { lat: 2.7, lng: 115.6 },
  "pulau bunyu": { lat: 3.45, lng: 117.83 },
  "pantai amal": { lat: 3.3, lng: 117.63 },
  "air terjun semolon": { lat: 3.55, lng: 116.0 },
  "hutan mangrove tarakan": { lat: 3.32, lng: 117.58 },

  "taman nasional bunaken": { lat: 1.623, lng: 124.76 },
  likupang: { lat: 1.68, lng: 125.02 },
  "danau linow": { lat: 1.27, lng: 124.83 },
  "gunung lokon": { lat: 1.358, lng: 124.792 },
  "pulau siladen": { lat: 1.627, lng: 124.8 },

  "taman laut olele": { lat: 0.415, lng: 123.13 },
  "pulau saronde": { lat: 0.92, lng: 122.86 },
  "benteng otanaha": { lat: 0.56, lng: 123.02 },
  "hiu paus botubarani": { lat: 0.47, lng: 123.07 },
  "pantai dunu": { lat: 0.85, lng: 122.4 },

  "kepulauan togean": { lat: -0.4, lng: 121.9 },
  "danau poso": { lat: -1.83, lng: 120.63 },
  "taman nasional lore lindu": { lat: -1.4, lng: 120.2 },
  "pantai tanjung karang": { lat: -0.68, lng: 119.75 },
  "air terjun saluopa": { lat: -1.4, lng: 120.75 },

  "pulau karampuang": { lat: -2.63, lng: 118.9 },
  "pantai dato": { lat: -2.68, lng: 118.86 },
  "air terjun tamasapi": { lat: -2.9, lng: 118.95 },
  "puncak mamuju city": { lat: -2.67, lng: 118.89 },
  "desa adat rambu saratu": { lat: -2.95, lng: 119.2 },

  "tana toraja": { lat: -2.97, lng: 119.87 },
  "pantai losari": { lat: -5.143, lng: 119.407 },
  "rammang-rammang": { lat: -4.9, lng: 119.6 },
  "tanjung bira": { lat: -5.61, lng: 120.45 },
  "benteng rotterdam": { lat: -5.141, lng: 119.405 },

  wakatobi: { lat: -5.32, lng: 123.59 },
  "pulau labengki": { lat: -3.3, lng: 122.4 },
  "pantai nambo": { lat: -4.05, lng: 122.6 },
  "air terjun moramo": { lat: -4.22, lng: 122.68 },
  "benteng keraton buton": { lat: -5.47, lng: 122.6 },

  "pantai ora": { lat: -2.98, lng: 129.14 },
  "kepulauan banda": { lat: -4.525, lng: 129.9 },
  "pantai natsepa": { lat: -3.63, lng: 128.28 },
  "benteng amsterdam": { lat: -3.66, lng: 128.18 },
  "pulau kei": { lat: -5.67, lng: 132.73 },

  "pulau morotai": { lat: 2.32, lng: 128.53 },
  "danau tolire": { lat: 0.82, lng: 127.31 },
  "gunung gamalama": { lat: 0.8, lng: 127.33 },
  "pantai sulamadaha": { lat: 0.86, lng: 127.33 },
  "benteng oranje": { lat: 0.79, lng: 127.385 },

  "pegunungan arfak": { lat: -1.08, lng: 133.97 },
  "pulau mansinam": { lat: -0.9, lng: 134.08 },
  "pantai pasir putih manokwari": { lat: -0.87, lng: 134.07 },
  "danau anggi": { lat: -1.38, lng: 133.87 },
  "teluk doreri": { lat: -0.87, lng: 134.06 },

  "raja ampat": { lat: -0.44, lng: 130.77 },
  piaynemo: { lat: -0.44, lng: 130.52 },
  wayag: { lat: 0.17, lng: 130.02 },
  "desa wisata arborek": { lat: -0.56, lng: 130.52 },
  "pulau misool": { lat: -1.85, lng: 130.17 },

  "danau sentani": { lat: -2.6, lng: 140.52 },
  "pantai base-g": { lat: -2.57, lng: 140.7 },
  "bukit teletubbies jayapura": { lat: -2.59, lng: 140.64 },
  "desa wisata asei": { lat: -2.6, lng: 140.58 },
  "pegunungan cycloop": { lat: -2.52, lng: 140.55 },

  "taman nasional wasur": { lat: -8.6, lng: 140.7 },
  "pantai lampu satu": { lat: -8.5, lng: 140.38 },
  "monumen kapsul waktu": { lat: -8.49, lng: 140.4 },
  "musamus merauke": { lat: -8.52, lng: 140.4 },
  "sota perbatasan ri-png": { lat: -8.43, lng: 140.42 },

  "taman nasional teluk cenderawasih": { lat: -2.9, lng: 134.8 },
  "pantai nabire": { lat: -3.36, lng: 135.5 },
  "danau paniai": { lat: -3.9, lng: 136.35 },
  "air terjun bihewa": { lat: -3.4, lng: 135.55 },
  "pulau ahe": { lat: -3.2, lng: 135.3 },

  "lembah baliem": { lat: -4.1, lng: 138.95 },
  "danau habema": { lat: -4.13, lng: 138.68 },
  "pasir putih aikima": { lat: -4.05, lng: 138.98 },
  "desa wamena": { lat: -4.1, lng: 138.95 },
  "goa kontilola": { lat: -4.12, lng: 138.92 },
};

const ALIASES: Record<string, string> = {
  bromo: "gunung bromo",
  "gunung bromo": "gunung bromo",
  "cemoro lawang": "gunung bromo",
  cemoro: "gunung bromo",
  tengger: "gunung bromo",
  "penanjakan": "penanjakan bromo",
  ijen: "kawah ijen",
  "gunung ijen": "kawah ijen",
  baluran: "taman nasional baluran",
  papuma: "pantai papuma",
  "pura tanah lot": "pura tanah lot",
  "tanah lot": "tanah lot",
  "uluwatu temple": "uluwatu",
  komodo: "taman nasional komodo",
  "labuan bajo": "pantai pink labuan bajo",
  padar: "pulau padar",
  "pink beach labuan bajo": "pantai pink labuan bajo",
  borobudur: "candi borobudur",
  prambanan: "candi prambanan",
  malioboro: "jalan malioboro",
  "keraton jogja": "keraton yogyakarta",
  "keraton yogyakarta": "keraton yogyakarta",
  dieng: "dataran tinggi dieng",
  rinjani: "gunung rinjani",
  "gili t": "gili trawangan",
  bunaken: "taman nasional bunaken",
  "raja ampat": "raja ampat",
  toraja: "tana toraja",
  "losari": "pantai losari",
  ampera: "jembatan ampera",
  monas: "monumen nasional",
  "kota tua": "kota tua jakarta",
  tmii: "taman mini indonesia indah",
  istiqlal: "masjid istiqlal",
  "gbk": "gelora bung karno",
  "senayan": "gelora bung karno",
};

export function normalizePlaceKey(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("id-ID")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ");
}

function lookupKey(key: string): LatLng | undefined {
  if (!key) return undefined;
  const alias = ALIASES[key];
  return PLACE_COORDINATES[key] ?? (alias ? PLACE_COORDINATES[alias] : undefined);
}

export function resolvePlaceCoordinates(name: string, city = ""): LatLng | undefined {
  const exact = normalizePlaceKey(name);
  const direct = lookupKey(exact);
  if (direct) return direct;

  const stripped = exact
    .replace(/^(pura|candi|gunung|gn\.?|tn\.?|taman nasional|pantai|pulau|danau|desa wisata|desa|air terjun|kawah|jembatan)\s+/i, "")
    .trim();
  const viaStrip = lookupKey(stripped);
  if (viaStrip) return viaStrip;

  const haystack = `${exact} ${normalizePlaceKey(city)}`.trim();
  const named = Object.keys(PLACE_COORDINATES)
    .concat(Object.keys(ALIASES))
    .filter((key) => {
      if (key.length < 5) return false;
      // Require the place name itself to relate to the key — do not match solely via city token
      // (avoids "… Walk" + Medan accidentally resolving through unrelated "* walk" keys).
      return exact.includes(key) || key.includes(exact) || (exact.length >= 5 && haystack.includes(key) && key.split(/\s+/).some((token) => token.length >= 4 && exact.includes(token)));
    })
    .sort((a, b) => b.length - a.length)[0];
  if (named) {
    const hit = lookupKey(named);
    if (hit) return hit;
  }

  if (city) {
    const cityHit = lookupKey(normalizePlaceKey(city));
    if (cityHit && exact.includes(normalizePlaceKey(city))) return cityHit;
  }
  return undefined;
}

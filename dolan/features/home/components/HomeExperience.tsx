"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";
import { searchClient, SearchError } from "../search-client";
import { searchQuerySchema } from "../search-schema";
import type { SearchResponse } from "../types";
import { ItineraryTemplateCard, PlaceCard, TripCard } from "./ResultCards";
import styles from "./home.module.css";

const travelRail = [["Labuan Bajo", ASSETS.komodo], ["Yogyakarta", ASSETS.jogja], ["Nusa Penida", ASSETS.nusaPenida], ["Gunung Batur", ASSETS.mountBatur], ["Canggu & Ubud", ASSETS.cangguUbud], ["Tanah Lot", ASSETS.tanahLot]] as const;
const quickFilters = ["Open Trip Aktif", "Khusus Solo Traveler", "Camping & Sunrise"];

export function HomeExperience() {
  const [city, setCity] = useState("Labuan Bajo");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState<"hemat" | "nyaman" | "premium">("hemat");
  const [filters, setFilters] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "searching" | "reveal">("idle");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!result && !error) return;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const close = (event: KeyboardEvent) => event.key === "Escape" && closeResults();
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", close); };
  }, [result, error]);

  function closeResults() { setResult(null); setError(""); setPhase("idle"); }
  function toggleFilter(filter: string) { setFilters((items) => items.includes(filter) ? items.filter((item) => item !== filter) : [...items, filter]); }
  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    const parsed = searchQuerySchema.safeParse({ city, startDate: date || undefined, budget, filters });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Periksa pencarianmu."); return; }
    controller.current?.abort();
    const activeController = new AbortController();
    controller.current = activeController;
    const sequence = ++requestSequence.current;
    setError(""); setResult(null); setPhase("searching");
    try {
      const response = await searchClient.search(parsed.data, activeController.signal);
      if (sequence !== requestSequence.current) return;
      setPhase("reveal"); setResult(response);
    } catch (caught) {
      if (activeController.signal.aborted || sequence !== requestSequence.current) return;
      setPhase("idle"); setError(caught instanceof SearchError ? caught.message : "Pencarian gagal. Coba lagi.");
    }
  }

  const hasResults = result && result.places.length + result.publicTrips.length + result.templates.length > 0;
  return <>
    <section className={styles.hero}>
      <div className={styles.skyGlow} />
      <div className={styles.earthViewport} aria-hidden="true"><div className={`${styles.earthWrap} ${styles[phase]}`}><img src="/images/hero-earth.webp" alt="" className={styles.earth} /></div></div>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}><span className={styles.eyebrow}>✦ Jelajah Indonesia dengan caramu</span><h1>Liburan seru dimulai dari <em>satu pencarian.</em></h1><p>Temukan tempat menarik, itinerary pilihan backpacker, dan teman perjalanan yang satu frekuensi.</p></div>
        <form onSubmit={submitSearch} className={styles.searchPanel} aria-label="Cari petualangan">
          <label className={styles.field}><span><Icon name="location_on" /> Tujuan / Kota</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Contoh: Labuan Bajo" /></label>
          <label className={styles.field}><span><Icon name="calendar_month" /> Tanggal Trip</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className={styles.field}><span><Icon name="payments" /> Budget Maksimal</span><select value={budget} onChange={(event) => setBudget(event.target.value as typeof budget)}><option value="hemat">Hemat (≤ Rp1 juta)</option><option value="nyaman">Nyaman (≤ Rp3 juta)</option><option value="premium">Premium</option></select></label>
          <button type="submit" className={styles.searchButton} disabled={phase === "searching"}><Icon name={phase === "searching" ? "schedule" : "explore"} />{phase === "searching" ? "Menjelajah..." : "Cari Petualangan"}</button>
          <div className={styles.quickFilters}><span>Filter cepat:</span>{quickFilters.map((filter) => <button type="button" aria-pressed={filters.includes(filter)} onClick={() => toggleFilter(filter)} key={filter}>{filter === "Open Trip Aktif" ? "⚡" : filter === "Khusus Solo Traveler" ? "🎒" : "⛺"} {filter}</button>)}</div>
        </form>
        <p className={styles.trustLine}><span>✓ Data wisata nyata</span><span>✓ Join trip gratis</span><span>✓ Itinerary komunitas</span></p>
      </div>
    </section>
    <section className={styles.railSection} aria-labelledby="inspirasi-title"><div className={styles.sectionHeading}><div><span>Lagi bikin rencana?</span><h2 id="inspirasi-title">Geser dulu, siapa tahu jatuh hati.</h2></div><Link href={ROUTES.jelajah}>Lihat semua →</Link></div><div className={styles.marquee}><div className={styles.marqueeTrack}>{[...travelRail, ...travelRail].map(([name, image], index) => <Link href={ROUTES.jelajah} className={styles.railCard} key={`${name}-${index}`} aria-hidden={index >= travelRail.length}><img src={image} alt={index < travelRail.length ? name : ""} /><strong>{name}</strong></Link>)}</div></div></section>
    <section className={styles.popularSection}><div className={styles.sectionHeading}><div><span>Paling ramai pekan ini</span><h2>Petualangan yang sedang jadi obrolan.</h2></div></div><div className={styles.editorialGrid}><article className={styles.featuredCard}><img src={ASSETS.komodo} alt="Pulau Padar, Labuan Bajo" /><div><span>Destinasi terpopuler</span><h3>Labuan Bajo</h3><p>Laut biru, bukit dramatis, dan pulau-pulau yang selalu bikin ingin kembali.</p><Link href={ROUTES.jelajah}>Jelajahi destinasi</Link></div></article><div className={styles.miniGrid}><article><span>Trip populer</span><h3>Sailing Komodo 4H3M</h3><p>76 pejalan tertarik · Sisa 3 kursi</p></article><article><span>Itinerary populer</span><h3>Bali Santai 3H2M</h3><p>Dipakai 128 pejalan</p></article></div></div></section>
    <section className={styles.aboutSection}><div className={styles.aboutCopy}><span>Kenalan dengan Dolan</span><h2>Dari bingung mau ke mana, sampai berangkat bareng.</h2><p>Dolan menyatukan pencarian destinasi, itinerary yang sudah dicoba komunitas, open trip publik, dan ruang koordinasi dalam satu tempat.</p><Link href={ROUTES.buatTrip}>Mulai bikin trip <span>→</span></Link></div><div className={styles.featureList}>{[["01", "Cari yang cocok", "Bandingkan wisata, trip, dan itinerary dari satu kota."], ["02", "Rencanakan tanpa ribet", "Pakai template atau susun perjalanan sesuai budgetmu."], ["03", "Temukan teman jalan", "Ajukan join gratis dan koordinasi bersama peserta."]].map(([number, title, copy]) => <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>
    {(result || error) && <div className={styles.modalBackdrop} onMouseDown={(event) => event.target === event.currentTarget && closeResults()}><div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="result-title" tabIndex={-1} ref={dialogRef}><div className={styles.modalHeader}><div><span>Hasil petualangan</span><h2 id="result-title">{result ? `${result.city.name}, ${result.city.province}` : "Pencarian belum berhasil"}</h2></div><button onClick={closeResults} aria-label="Tutup hasil">×</button></div>{error ? <div className={styles.stateBox}><b>Ups, belum bisa menjelajah.</b><p>{error}</p><button onClick={() => { setError(""); setPhase("idle"); }}>Ubah pencarian</button></div> : !hasResults ? <div className={styles.stateBox}><b>Belum ada hasil di kota ini.</b><p>Coba nama kota terdekat atau ubah filter pencarianmu.</p><button onClick={closeResults}>Cari kota lain</button></div> : <div className={styles.results}><ResultSection title="Tempat wisata" count={result.places.length}>{result.places.map((item) => <PlaceCard key={item.id} place={item} />)}</ResultSection><ResultSection title="Trip publik" count={result.publicTrips.length}>{result.publicTrips.map((item) => <TripCard key={item.id} trip={item} />)}</ResultSection><ResultSection title="Itinerary pilihan" count={result.templates.length}>{result.templates.map((item) => <ItineraryTemplateCard key={item.id} template={item} />)}</ResultSection></div>}</div></div>}
  </>;
}

function ResultSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (!count) return null;
  return <section><div className={styles.resultTitle}><h3>{title}</h3><span>{count} hasil</span></div><div className={styles.resultGrid}>{children}</div></section>;
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Field } from "@/components/auth/Field";
import { Icon } from "@/components/ui/Icon";
import { PlacePicker } from "@/components/trip/PlacePicker";
import { TripBoardMap } from "@/components/trip/TripBoardMap";
import type { ApiError, CreateTripInput, TripDetail } from "@/lib/contracts";
import { ASSETS } from "@/lib/assets";
import { tripDetailHref } from "@/lib/routes";
import { meetingPointFor, resolveGeoPlace } from "@/mocks/geo";

const steps = [
  "Pilih Jalur",
  "Dasar Trip",
  "Budget",
  "AI / Tujuan",
  "Review",
  "Publish",
] as const;

const activities = [
  "Snorkeling",
  "Sunrise Trekking",
  "Fotografi",
  "Kuliner",
  "Satwa Liar",
] as const;

const aiPicks = [
  { city: "Labuan Bajo", region: "NTT", cover: ASSETS.komodo },
  { city: "Gunung Bromo", region: "Jawa Timur", cover: ASSETS.mountBatur },
  { city: "Raja Ampat", region: "Papua Barat Daya", cover: ASSETS.nusaPenida },
] as const;

type Path = "known" | "ai";

function newKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `trip-${Date.now()}`;
}

export function CreateTripWizard() {
  const router = useRouter();
  const idempotencyKey = useMemo(newKey, []);
  const [step, setStep] = useState(1);
  const [path, setPath] = useState<Path>("known");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transport, setTransport] = useState("Kapal Phinisi");
  const [planningPartySize, setPlanningPartySize] = useState(4);
  const [budgetAmount, setBudgetAmount] = useState(2_000_000);
  const [budgetBasis, setBudgetBasis] = useState<"PER_PERSON" | "GROUP">(
    "PER_PERSON",
  );
  const [lodgingPref, setLodgingPref] = useState("Homestay / Guesthouse Lokal");
  const [activityPrefs, setActivityPrefs] = useState<string[]>(["Snorkeling"]);
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [maxParticipants, setMaxParticipants] = useState(7);
  const [meetingPoint, setMeetingPoint] = useState("");
  const [companionNote, setCompanionNote] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const visualStep = step === 4 && path === "known" ? 5 : step;

  const previewMarkers = useMemo(() => {
    const markers: {
      id: string;
      label: string;
      latitude: number;
      longitude: number;
      selected?: boolean;
      tone: "origin" | "meeting";
    }[] = [];
    const originPlace = resolveGeoPlace(origin);
    if (originPlace) {
      markers.push({
        id: "origin",
        label: originPlace.label,
        latitude: originPlace.latitude,
        longitude: originPlace.longitude,
        tone: "origin",
      });
    }
    const meeting = meetingPointFor(meetingPoint, destinationCity);
    if (visibility === "PUBLIC" && meeting) {
      markers.push({
        id: "meeting",
        label: meetingPoint || destinationCity || "Titik temu",
        latitude: meeting.latitude,
        longitude: meeting.longitude,
        selected: true,
        tone: "meeting",
      });
    }
    return markers;
  }, [origin, meetingPoint, destinationCity, visibility]);

  function payload(): CreateTripInput {
    return {
      path,
      title,
      description,
      origin,
      destinationCity,
      startDate,
      endDate,
      transport,
      planningPartySize,
      budgetAmount,
      budgetBasis,
      lodgingPref,
      activityPrefs,
      visibility,
      maxParticipants: visibility === "PUBLIC" ? maxParticipants : undefined,
      meetingPoint: visibility === "PUBLIC" ? meetingPoint : "",
      companionNote,
    };
  }

  function toggleActivity(name: string) {
    setActivityPrefs((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  function goNext() {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(path === "ai" && !destinationCity.trim() ? 4 : 5);
      return;
    }
    if (step === 4) setStep(5);
  }

  async function submit(mode: "draft" | "publish") {
    setPending(true);
    setFormError("");
    setFieldErrors({});
    const created = await fetch("/api/v1/trips", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(payload()),
    });
    const json = (await created.json()) as
      | { success: true; data: TripDetail }
      | ApiError;
    if (!json.success) {
      setPending(false);
      setFormError(json.error.message);
      setFieldErrors(json.error.fields ?? {});
      return;
    }
    if (mode === "publish") {
      const published = await fetch(`/api/v1/trips/${json.data.id}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmPublish: true, visibility }),
      });
      const pubJson = (await published.json()) as
        | { success: true; data: TripDetail }
        | ApiError;
      setPending(false);
      if (!pubJson.success) {
        setFormError(pubJson.error.message);
        return;
      }
      router.push(tripDetailHref(pubJson.data.id));
      router.refresh();
      return;
    }
    setPending(false);
    router.push(tripDetailHref(json.data.id));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-margin py-8 md:px-margin-desktop md:py-12">
      <div className="mb-8 hidden items-center justify-between sm:flex">
        {steps.map((label, i) => {
          const n = i + 1;
          const active = visualStep === n || (visualStep === 6 && n >= 5);
          const done = visualStep > n;
          return (
            <div key={label} className="flex flex-1 flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full type-micro ${
                  active || done
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {n}
              </span>
              <span className="type-micro mt-1 text-on-surface-variant">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <>
          <Header n={1} title="Bagaimana kamu ingin memulai rencana ini?" />
          <div className="grid gap-4 md:grid-cols-2">
            <PathCard
              selected={path === "known"}
              title="Aku sudah punya tujuan"
              desc="Isi destinasi, tanggal, dan budget. Itinerary AI lengkap menyusul."
              onClick={() => setPath("known")}
            />
            <PathCard
              selected={path === "ai"}
              title="Bantu AI pilih tujuan"
              desc="Tujuan boleh kosong. Pilih dari rekomendasi mock, generator 6 langkah Alya menyusul."
              onClick={() => setPath("ai")}
            />
          </div>
          <Nav nextLabel="Lanjut" onNext={goNext} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Header n={2} title="Informasi dasar perjalanan" />
          <div className="card-surface space-y-4 p-5 md:p-7">
            <Field id="title" label="Judul Trip" error={fieldErrors.title}>
              <input
                id="title"
                className="field-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Sailing Komodo 4D3N"
              />
            </Field>
            <Field id="description" label="Deskripsi" hint="Opsional">
              <textarea
                id="description"
                className="field-input min-h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <PlacePicker
                id="origin"
                label="Asal / titik keberangkatan"
                value={origin}
                onChange={setOrigin}
                error={fieldErrors.origin}
                placeholder="Cari kota atau bandara"
                hint="Asal pribadi tidak dipakai sebagai titik temu publik."
              />
              <Field
                id="destinationCity"
                label="Destinasi utama"
                error={fieldErrors.destinationCity}
                hint={path === "ai" ? "Boleh kosong di jalur Bantu AI" : undefined}
              >
                <input
                  id="destinationCity"
                  className="field-input"
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  placeholder="Kota atau taman nasional"
                />
              </Field>
            </div>
            {previewMarkers.length > 0 ? (
              <TripBoardMap compact markers={previewMarkers} />
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="startDate" label="Tanggal mulai" error={fieldErrors.startDate}>
                <input
                  id="startDate"
                  type="date"
                  className="field-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field id="endDate" label="Tanggal selesai" error={fieldErrors.endDate}>
                <input
                  id="endDate"
                  type="date"
                  className="field-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="transport" label="Moda transportasi">
                <select
                  id="transport"
                  className="field-input"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                >
                  <option>Kapal Phinisi</option>
                  <option>Pesawat + sewa mobil</option>
                  <option>Kereta</option>
                  <option>Kendaraan pribadi</option>
                </select>
              </Field>
              <Field
                id="planningPartySize"
                label="Jumlah orang untuk estimasi biaya"
                hint="Bukan kuota publik. Kapasitas diisi terpisah jika trip dibuka."
                error={fieldErrors.planningPartySize}
              >
                <input
                  id="planningPartySize"
                  type="number"
                  min={1}
                  className="field-input"
                  value={planningPartySize}
                  onChange={(e) => setPlanningPartySize(Number(e.target.value))}
                />
              </Field>
            </div>
          </div>
          <Nav onBack={() => setStep(1)} onNext={goNext} />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Header n={3} title="Budget, preferensi, dan visibilitas" />
          <div className="card-surface space-y-5 p-5 md:p-7">
            <div className="rounded-xl bg-surface-container-low p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="type-label text-on-surface">Target budget</span>
                <div className="flex gap-3">
                  <label className="type-caption flex items-center gap-1">
                    <input
                      type="radio"
                      checked={budgetBasis === "PER_PERSON"}
                      onChange={() => setBudgetBasis("PER_PERSON")}
                    />
                    Per orang
                  </label>
                  <label className="type-caption flex items-center gap-1">
                    <input
                      type="radio"
                      checked={budgetBasis === "GROUP"}
                      onChange={() => setBudgetBasis("GROUP")}
                    />
                    Total rombongan
                  </label>
                </div>
              </div>
              <Field id="budgetAmount" label="Nominal (Rp)" error={fieldErrors.budgetAmount}>
                <input
                  id="budgetAmount"
                  type="number"
                  min={1}
                  className="field-input"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(Number(e.target.value))}
                />
              </Field>
              <p className="type-caption mt-2 text-on-surface-variant">
                Estimasi swadaya, bukan harga join atau tagihan.
              </p>
            </div>
            <Field id="lodgingPref" label="Pilihan akomodasi">
              <select
                id="lodgingPref"
                className="field-input"
                value={lodgingPref}
                onChange={(e) => setLodgingPref(e.target.value)}
              >
                <option>Homestay / Guesthouse Lokal</option>
                <option>Kabin kapal / liveaboard</option>
                <option>Hotel</option>
                <option>Camping</option>
              </select>
            </Field>
            <div>
              <p className="type-label mb-2 text-on-surface">Aktivitas prioritas</p>
              <div className="flex flex-wrap gap-2">
                {activities.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleActivity(item)}
                    className={`chip ${
                      activityPrefs.includes(item)
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-high text-on-surface"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant p-4">
              <span>
                <span className="type-label block text-on-surface">
                  Rencana perjalanan publik?
                </span>
                <span className="type-caption text-on-surface-variant">
                  Public tidak otomatis terbit. Publish butuh konfirmasi di langkah terakhir.
                </span>
              </span>
              <input
                type="checkbox"
                checked={visibility === "PUBLIC"}
                onChange={(e) =>
                  setVisibility(e.target.checked ? "PUBLIC" : "PRIVATE")
                }
              />
            </label>
            {visibility === "PUBLIC" ? (
              <div className="space-y-3 rounded-xl bg-surface-container-low p-4">
                <Field
                  id="maxParticipants"
                  label="Kapasitas maksimal (termasuk host)"
                  error={fieldErrors.maxParticipants}
                >
                  <input
                    id="maxParticipants"
                    type="number"
                    min={2}
                    className="field-input"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  />
                </Field>
                <PlacePicker
                  id="meetingPoint"
                  label="Titik temu publik"
                  value={meetingPoint}
                  onChange={setMeetingPoint}
                  excludeLabel={origin}
                  error={fieldErrors.meetingPoint}
                  hint="Jangan salin alamat/asal pribadi."
                  placeholder="Bandara / pelabuhan / area publik"
                />
                {previewMarkers.length > 0 ? (
                  <TripBoardMap compact markers={previewMarkers} />
                ) : null}
                <Field id="companionNote" label="Catatan untuk rekan jalan">
                  <textarea
                    id="companionNote"
                    className="field-input min-h-20"
                    value={companionNote}
                    onChange={(e) => setCompanionNote(e.target.value)}
                  />
                </Field>
                <p className="type-caption text-primary">
                  Join gratis — biaya perjalanan ditanggung masing-masing. Tidak ada deposit.
                </p>
              </div>
            ) : null}
          </div>
          <Nav onBack={() => setStep(2)} onNext={goNext} nextLabel="Lanjut ke review" />
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Header n={4} title="Pilih destinasi rekomendasi (mock)" />
          <p className="type-body mb-4 text-on-surface-variant">
            Ini daftar contoh, bukan hasil job AI Alya. Pilih satu supaya draft punya tujuan.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {aiPicks.map((pick) => (
              <button
                key={pick.city}
                type="button"
                onClick={() => setDestinationCity(pick.city)}
                className={`card-surface overflow-hidden text-left ${
                  destinationCity === pick.city ? "ring-2 ring-primary" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" src={pick.cover} className="h-28 w-full object-cover" />
                <div className="p-3">
                  <p className="type-subtitle text-on-surface">{pick.city}</p>
                  <p className="type-caption text-on-surface-variant">{pick.region}</p>
                </div>
              </button>
            ))}
          </div>
          <Nav
            onBack={() => setStep(3)}
            onNext={goNext}
            nextLabel="Pakai destinasi ini"
          />
        </>
      ) : null}

      {step === 5 ? (
        <>
          <Header n={6} title="Simpan draft atau konfirmasi publish" />
          <div className="card-surface space-y-3 p-5">
            <p className="type-subtitle text-on-surface">{title || "(Tanpa judul)"}</p>
            <p className="type-body text-on-surface-variant">
              {origin || "Asal?"} → {destinationCity || "(tujuan belakangan)"} ·{" "}
              {startDate} – {endDate}
            </p>
            <p className="type-caption text-on-surface-variant">
              {visibility === "PUBLIC" ? "Niat publik" : "Private"} · rencana{" "}
              {planningPartySize} orang
              {visibility === "PUBLIC" ? ` · kapasitas ${maxParticipants}` : ""} · Rp{" "}
              {budgetAmount.toLocaleString("id-ID")}{" "}
              {budgetBasis === "PER_PERSON" ? "/ orang" : " rombongan"}
            </p>
            <p className="type-caption text-on-surface-variant">
              Draft tidak otomatis tampil di pencarian publik.
            </p>
            {visibility === "PUBLIC" ? (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmPublish}
                  onChange={(e) => setConfirmPublish(e.target.checked)}
                />
                <span className="type-caption text-on-surface">
                  Saya konfirmasi memublikasikan trip ini. Join tetap gratis, tanpa
                  checkout.
                </span>
              </label>
            ) : (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmPublish}
                  onChange={(e) => setConfirmPublish(e.target.checked)}
                />
                <span className="type-caption text-on-surface">
                  Simpan sebagai perjalanan private (status closed, tidak menerima join).
                </span>
              </label>
            )}
          </div>
          {formError ? (
            <p className="type-body mt-3 text-error" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setStep(path === "ai" && !destinationCity ? 4 : 3)}
            >
              Kembali
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={pending}
                onClick={() => void submit("draft")}
              >
                Simpan draft
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={pending || !confirmPublish}
                onClick={() => void submit("publish")}
              >
                {pending ? "Menyimpan…" : "Konfirmasi & publish"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Header({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-6 text-center">
      <span className="chip bg-primary-fixed text-primary">Langkah {n} dari 6</span>
      <h1 className="type-title mt-3 text-on-surface">{title}</h1>
    </div>
  );
}

function PathCard({
  selected,
  title,
  desc,
  onClick,
}: {
  selected: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-surface p-6 text-left ${selected ? "ring-2 ring-primary" : ""}`}
    >
      <h2 className="type-subtitle text-on-surface">{title}</h2>
      <p className="type-body mt-2 text-on-surface-variant">{desc}</p>
    </button>
  );
}

function Nav({
  onBack,
  onNext,
  nextLabel = "Lanjut",
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="mt-6 flex justify-between gap-3">
      {onBack ? (
        <button type="button" className="btn-ghost" onClick={onBack}>
          Kembali
        </button>
      ) : (
        <span />
      )}
      <button type="button" className="btn-primary" onClick={onNext}>
        {nextLabel}
        <Icon name="arrow_forward" className="text-[16px]" />
      </button>
    </div>
  );
}

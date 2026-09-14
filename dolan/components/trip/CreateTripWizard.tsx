"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Field } from "@/components/auth/Field";
import { Icon } from "@/components/ui/Icon";
import { PlacePicker } from "@/components/trip/PlacePicker";
import { TripBoardMap } from "@/components/trip/TripBoardMap";
import type { ItineraryTemplateDetail, UseTemplateResult } from "@dolan/shared";
import type { ApiError, CreateTripInput, TripDetail } from "@/lib/contracts";
import { ASSETS } from "@/lib/assets";
import { tripDetailHref, tripItineraryPath } from "@/lib/routes";
import { INDONESIA_PROVINCES, searchProvinces } from "@/lib/provinces";
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

type Path = "manual" | "ai-route" | "ai-discovery" | "template";

function newKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `trip-${Date.now()}`;
}

type CreateTripWizardProps = {
  templateId?: string;
  initialPlaceId?: string;
  initialDestination?: string;
};

export function CreateTripWizard({ templateId, initialPlaceId, initialDestination }: CreateTripWizardProps) {
  const router = useRouter();
  const idempotencyKey = useMemo(() => newKey(), []);
  const publishIdempotencyKey = useMemo(() => newKey(), []);
  const [step, setStep] = useState(1);
  const [path, setPath] = useState<Path>(templateId ? "template" : "manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");
  const [destinationCity, setDestinationCity] = useState(initialDestination ?? "");
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
  const [pace, setPace] = useState<"SANTAI" | "SEIMBANG" | "PADAT">("SEIMBANG");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState("");
  const [genderRule, setGenderRule] = useState<"ALL_GENDERS" | "FEMALE_ONLY" | "MALE_ONLY">("ALL_GENDERS");
  const [communityRules, setCommunityRules] = useState("");
  const [privateInvite, setPrivateInvite] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateLoading, setTemplateLoading] = useState(Boolean(templateId));
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId ?? "");
  const [templateQuery, setTemplateQuery] = useState("");
  const [regenerateMode, setRegenerateMode] = useState<"balanced" | "cheaper" | "alternative">("balanced");
  const [connections, setConnections] = useState<Array<{ username: string; displayName: string }>>([]);

  useEffect(() => {
    if (!templateId) return;
    const controller = new AbortController();
    fetch(`/api/v1/templates/${encodeURIComponent(templateId)}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as { success: boolean; data?: ItineraryTemplateDetail; error?: { message?: string } };
        if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message ?? "Template tidak tersedia.");
        setTemplateTitle(payload.data.title);
        setTitle((current) => current || payload.data!.title);
        setDestinationCity((current) => current || payload.data!.city);
        setTransport((current) => payload.data!.transportMode || current);
        setPath("template");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setFormError(error instanceof Error ? error.message : "Template tidak dapat dimuat.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setTemplateLoading(false);
      });
    return () => controller.abort();
  }, [templateId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/users/me", { credentials: "include", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: { success?: boolean; data?: { user?: { username?: string } } } | null) => {
        const username = payload?.data?.user?.username;
        if (!username) return null;
        return fetch(`/api/v1/users/${encodeURIComponent(username)}/following`, { credentials: "include", signal: controller.signal });
      })
      .then(async (response) => response && response.ok ? response.json() : null)
      .then((payload: { success?: boolean; data?: { items?: Array<{ username: string; displayName: string }> } } | null) => {
        if (!controller.signal.aborted) setConnections(payload?.data?.items ?? []);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const visualStep = step === 4 && (path === "manual" || path === "template") ? 5 : step;

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
      pace,
      accessibilityNeeds,
      genderRule,
      communityRules,
      privateInvite,
      regenerateMode,
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
      if (path === "template" && !selectedTemplateId) {
        setFormError("Pilih salah satu template provinsi dulu.");
        return;
      }
      setFormError("");
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(path === "ai-discovery" || path === "ai-route" ? 4 : 5);
      return;
    }
    if (step === 4) setStep(5);
  }

  async function submit(mode: "draft" | "publish") {
    if (pending || templateLoading) return;
    setPending(true);
    setFormError("");
    setFieldErrors({});
    const activeTemplateId = selectedTemplateId || templateId;
    const created = await fetch(activeTemplateId ? `/api/v1/templates/${encodeURIComponent(activeTemplateId)}/use` : "/api/v1/trips", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(activeTemplateId ? {
        templateTitle: templateTitle || title,
        destinationCity,
        originLabel: origin || undefined,
        startDate,
        endDate: endDate || undefined,
        transportMode: transport || undefined,
        planningPartySize,
        budgetAmount: String(budgetAmount),
        budgetBasis,
      } : payload()),
    });
    const json = (await created.json()) as
      | { success: true; data: TripDetail | UseTemplateResult }
      | ApiError;
    if (!json.success) {
      setPending(false);
      setFormError(json.error.message);
      setFieldErrors(json.error.fields ?? {});
      return;
    }
    const createdTripId = "tripId" in json.data ? json.data.tripId : json.data.id;
    if (visibility === "PRIVATE" && privateInvite.trim()) {
      const entries = privateInvite.split(",").map((item) => item.trim()).filter(Boolean);
      for (const entry of entries) {
        const isDolan = entry.startsWith("@");
        const invitationResponse = await fetch(`/api/v1/trips/${createdTripId}/invitations`, {
          method: "POST", credentials: "include", headers: { "content-type": "application/json" },
          body: JSON.stringify(isDolan ? { channel: "DOLAN", username: entry } : { channel: "WHATSAPP" }),
        });
        const invitation = await invitationResponse.json() as { success: boolean; data?: { invitePath: string } };
        if (invitation.success && invitation.data && !isDolan) {
          const phone = entry.replace(/\D/g, "").replace(/^0/, "62");
          const inviteUrl = `${window.location.origin}${invitation.data.invitePath}`;
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Yuk ikut trip DOLAN saya. Biaya perjalanan ditanggung masing-masing: ${inviteUrl}`)}`, "_blank", "noopener,noreferrer");
        }
      }
    }
    if (path === "ai-route" || path === "ai-discovery") {
      await fetch(`/api/v1/trips/${createdTripId}/generate`, { method: "POST", credentials: "include", headers: { "content-type": "application/json", "idempotency-key": newKey() }, body: JSON.stringify({ type: path === "ai-discovery" ? "RECOMMEND_DESTINATIONS" : "GENERATE_ITINERARY", idempotencyKey: newKey(), preferences: { mode: path, regenerateMode } }) }).catch(() => undefined);
    }
    if (mode === "publish") {
      const published = await fetch(`/api/v1/trips/${createdTripId}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "idempotency-key": publishIdempotencyKey },
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
    router.push(tripItineraryPath(createdTripId));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-margin py-8 md:px-margin-desktop md:py-12">
      {templateId || selectedTemplateId ? <div className="mb-5 rounded-2xl border border-primary/15 bg-primary-fixed/45 px-4 py-3" role="status"><p className="type-label font-extrabold text-primary">{templateLoading ? "Memuat template itinerary…" : `Template dipilih: ${templateTitle || "Rute traveler"}`}</p><p className="mt-1 type-caption text-on-surface-variant">Tanggal, titik awal, dan budget tetap bisa kamu sesuaikan. Setelah disimpan, rute akan terbuka di editor.</p></div> : initialPlaceId ? <p className="mb-5 rounded-2xl bg-primary-fixed/45 px-4 py-3 type-caption text-on-surface-variant">Destinasi dari halaman wisata sudah dimasukkan. Lengkapi tanggal dan budget untuk melanjutkan.</p> : null}
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
              selected={path === "manual"}
              title="Punya rencana sendiri"
              desc="Tentukan tujuan dan susun aktivitas manual di editor itinerary."
              onClick={() => setPath("manual")}
            />
            <PathCard
              selected={path === "ai-route"}
              title="Optimalkan rute dengan AI"
              desc="Kamu sudah tahu tujuannya; Groq menyusun urutan, jadwal, dan estimasi budget."
              onClick={() => setPath("ai-route")}
            />
            <PathCard
              selected={path === "ai-discovery"}
              title="Bantu AI pilih tujuan"
              desc="Belum tahu mau ke mana? Isi waktu, asal, budget, dan preferensi untuk mendapat rekomendasi."
              onClick={() => setPath("ai-discovery")}
            />
            <PathCard
              selected={path === "template"}
              title="Pakai itinerary populer"
              desc="Mulai dari salah satu dari 38 template provinsi DOLAN lalu edit sesuai kebutuhanmu."
              onClick={() => setPath("template")}
            />
          </div>
          {path === "template" ? (
            <div className="mt-5 rounded-[1.75rem] border border-primary/15 bg-white p-5">
              <Field id="templateQuery" label="Cari template provinsi" hint="Kalau dikosongkan, urutan mengikuti 38 kurasi DOLAN.">
                <input id="templateQuery" className="field-input" value={templateQuery} onChange={(event) => setTemplateQuery(event.target.value)} placeholder="Jawa Barat, Bali, Aceh…" />
              </Field>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(templateQuery.trim() ? searchProvinces(templateQuery) : INDONESIA_PROVINCES.slice(0, 8)).map((province) => (
                  <button
                    type="button"
                    key={province.slug}
                    onClick={() => {
                      setSelectedTemplateId(province.template.id);
                      setTemplateTitle(province.template.title);
                      setTitle((current) => current || province.template.title);
                      setDestinationCity(province.name);
                      setTransport(province.template.transportMode);
                    }}
                    className={`rounded-2xl border p-4 text-left ${selectedTemplateId === province.template.id ? "border-primary bg-primary-fixed/40" : "border-outline-variant bg-surface-container-low"}`}
                  >
                    <p className="type-label text-primary">{province.name}</p>
                    <p className="type-subtitle mt-1 text-on-surface">{province.template.title}</p>
                    <p className="type-caption mt-1 text-on-surface-variant">{province.template.durationDays} hari · backpacker</p>
                  </button>
                ))}
              </div>
              {!templateQuery.trim() ? <p className="mt-3 type-caption text-on-surface-variant">Menampilkan 8 template pertama. Ketik nama provinsi untuk mencari 38 rute kurasi.</p> : null}
            </div>
          ) : null}
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
                hint={path === "ai-discovery" ? "Boleh kosong; AI akan merekomendasikan tujuan" : undefined}
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
            <div className="grid gap-4 md:grid-cols-2"><Field id="pace" label="Tempo perjalanan"><select id="pace" className="field-input" value={pace} onChange={(event) => setPace(event.target.value as typeof pace)}><option value="SANTAI">Santai</option><option value="SEIMBANG">Seimbang</option><option value="PADAT">Padat</option></select></Field><Field id="accessibilityNeeds" label="Aksesibilitas / kebutuhan khusus" hint="Opsional"><input id="accessibilityNeeds" className="field-input" value={accessibilityNeeds} onChange={(event) => setAccessibilityNeeds(event.target.value)} placeholder="Contoh: hindari banyak tangga" /></Field></div>
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
                <div className="grid gap-3 md:grid-cols-2"><Field id="genderRule" label="Aturan peserta"><select id="genderRule" className="field-input" value={genderRule} onChange={(event) => setGenderRule(event.target.value as typeof genderRule)}><option value="ALL_GENDERS">Semua gender</option><option value="FEMALE_ONLY">Female only</option><option value="MALE_ONLY">Male only</option></select></Field><Field id="communityRules" label="Aturan grup"><textarea id="communityRules" className="field-input min-h-20" value={communityRules} onChange={(event) => setCommunityRules(event.target.value)} placeholder="Ketepatan waktu, pembagian biaya, barang wajib…" /></Field></div>
                <p className="type-caption text-primary">
                  Join gratis — biaya perjalanan ditanggung masing-masing. Tidak ada deposit.
                </p>
              </div>
            ) : <div className="rounded-xl bg-primary-fixed/35 p-4">
              <Field id="privateInvite" label="Undang teman (opsional)" hint="Pilih teman yang sudah saling follow, atau masukkan username/@ dan nomor WhatsApp dipisah koma.">
                <input id="privateInvite" className="field-input" value={privateInvite} onChange={(event) => setPrivateInvite(event.target.value)} placeholder="@sinta, @dimas, 0812…" />
              </Field>
              {connections.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {connections.map((person) => {
                    const tag = `@${person.username}`;
                    const selected = privateInvite.split(",").map((item) => item.trim()).includes(tag);
                    return (
                      <button
                        type="button"
                        key={person.username}
                        className={`rounded-full px-3 py-2 type-label ${selected ? "bg-primary text-white" : "bg-white text-on-surface"}`}
                        onClick={() => {
                          const current = privateInvite.split(",").map((item) => item.trim()).filter(Boolean);
                          setPrivateInvite((selected ? current.filter((item) => item !== tag) : [...current, tag]).join(", "));
                        }}
                      >
                        {tag} · {person.displayName}
                      </button>
                    );
                  })}
                </div>
              ) : <p className="mt-2 type-caption text-on-surface-variant">Belum ada koneksi DOLAN. Follow balik dulu, atau undang lewat WhatsApp.</p>}
            </div>}
          </div>
          <Nav onBack={() => setStep(2)} onNext={goNext} nextLabel="Lanjut ke review" />
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Header n={4} title={path === "ai-discovery" ? "Pilih arah rekomendasi AI" : "Atur cara Groq menyusun rute"} />
          <p className="type-body mb-4 text-on-surface-variant">
            Setelah draft disimpan, Groq membuat versi itinerary baru. Kalau hasilnya kurang cocok, kamu bisa regenerate biasa, hemat, atau rute alternatif dari editor.
          </p>
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            {([
              ["balanced", "Regenerate biasa", "Seimbang antara waktu, biaya, dan destinasi populer."],
              ["cheaper", "Alternatif hemat", "Transport umum, makan kaki lima, dan jarak tempuh lebih pendek."],
              ["alternative", "Rute alternatif", "Urutan dan tempat berbeda dari rute umum backpacker."],
            ] as const).map(([id, title, desc]) => (
              <button key={id} type="button" onClick={() => setRegenerateMode(id)} className={`card-surface p-4 text-left ${regenerateMode === id ? "ring-2 ring-primary" : ""}`}>
                <p className="type-subtitle text-on-surface">{title}</p>
                <p className="type-caption mt-1 text-on-surface-variant">{desc}</p>
              </button>
            ))}
          </div>
          {path === "ai-discovery" ? (
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
          ) : null}
          <Nav
            onBack={() => setStep(3)}
            onNext={goNext}
            nextLabel={path === "ai-discovery" ? "Pakai destinasi ini" : "Lanjut review"}
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
              onClick={() => setStep(path === "ai-discovery" || path === "ai-route" ? 4 : 3)}
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

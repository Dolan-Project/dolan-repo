"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Field } from "@/components/auth/Field";
import { PlacePicker } from "@/components/trip/PlacePicker";
import { TripBoardMap } from "@/components/trip/TripBoardMap";
import type { ApiError, CreateTripInput, TripDetail } from "@/lib/contracts";
import { tripDetailHref } from "@/lib/routes";
import { meetingPointFor, resolveGeoPlace } from "@/mocks/geo";

const activities = [
  "Snorkeling",
  "Sunrise Trekking",
  "Fotografi",
  "Kuliner",
  "Satwa Liar",
] as const;

const lodgings = [
  "Homestay / Guesthouse Lokal",
  "Homestay",
  "Kabin kapal / liveaboard",
  "Hotel",
  "Camping",
] as const;

export function TripEditForm({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [denied, setDenied] = useState("");
  const [path, setPath] = useState<"known" | "ai">("known");
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
  const [activityPrefs, setActivityPrefs] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [maxParticipants, setMaxParticipants] = useState(7);
  const [meetingPoint, setMeetingPoint] = useState("");
  const [companionNote, setCompanionNote] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const ac = new AbortController();
    async function load() {
      const response = await fetch(`/api/v1/trips/${tripId}`, {
        credentials: "include",
        signal: ac.signal,
      });
      const json = (await response.json()) as
        | { success: true; data: TripDetail }
        | ApiError;
      if (ac.signal.aborted) return;
      if (!json.success) {
        setDenied(json.error.message);
        return;
      }
      if (json.data.viewerRole !== "host") {
        setDenied("Hanya host yang dapat mengedit trip ini.");
        return;
      }
      const trip = json.data;
      setPath(trip.destinationCity ? "known" : "ai");
      setTitle(trip.title);
      setDescription(trip.description ?? "");
      setOrigin(trip.origin ?? trip.privateOriginLabel ?? "");
      setDestinationCity(trip.destinationCity ?? "");
      setStartDate(trip.startDate ?? "");
      setEndDate(trip.endDate ?? "");
      setTransport(trip.transport ?? trip.transportMode ?? "Kapal Phinisi");
      setPlanningPartySize(trip.planningPartySize);
      setBudgetAmount(Number(trip.budgetAmount ?? 0) || 0);
      setBudgetBasis(trip.budgetBasis);
      setLodgingPref(trip.lodgingPref || "Homestay / Guesthouse Lokal");
      setActivityPrefs(trip.activityPrefs ?? []);
      setVisibility(trip.visibility);
      setMaxParticipants(trip.maxParticipants ?? 7);
      setMeetingPoint(trip.meetingPoint ?? trip.publicMeetingPointLabel ?? "");
      setCompanionNote(trip.companionNote ?? "");
      setLoaded(true);
    }
    void load();
    return () => ac.abort();
  }, [tripId]);

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

  async function save() {
    setPending(true);
    setFormError("");
    setFieldErrors({});
    const response = await fetch(`/api/v1/trips/${tripId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    });
    const json = (await response.json()) as
      | { success: true; data: TripDetail }
      | ApiError;
    setPending(false);
    if (!json.success) {
      setFormError(json.error.message);
      setFieldErrors(json.error.fields ?? {});
      return;
    }
    router.push(tripDetailHref(json.data.id));
    router.refresh();
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl px-margin py-10">
        <p className="type-body text-error" role="alert">
          {denied}
        </p>
        <Link href={tripDetailHref(tripId)} className="type-label mt-4 inline-block text-primary">
          Kembali ke detail
        </Link>
      </div>
    );
  }

  if (!loaded) {
    return (
      <p className="px-margin py-10 type-body text-on-surface-variant">Memuat form edit…</p>
    );
  }

  const lodgingOptions = lodgings.includes(lodgingPref as (typeof lodgings)[number])
    ? lodgings
    : ([lodgingPref, ...lodgings] as const);

  return (
    <div className="mx-auto max-w-3xl px-margin py-8 md:px-margin-desktop md:py-12">
      <p className="type-micro uppercase tracking-wider text-primary">Edit trip</p>
      <h1 className="type-title mt-1 text-on-surface">Perbarui rencana perjalanan</h1>
      <p className="type-body mt-1 text-on-surface-variant">
        Field sama dengan Buat Trip. Kapasitas tidak boleh di bawah anggota aktif.
      </p>

      <div className="card-surface mt-6 space-y-4 p-5 md:p-7">
        <Field id="title" label="Judul Trip" error={fieldErrors.title}>
          <input
            id="title"
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          >
            <input
              id="destinationCity"
              className="field-input"
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
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
        <Field
            id="planningPartySize"
            label="Jumlah orang untuk estimasi biaya"
            hint="Bukan kuota publik."
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
        </div>
        <Field id="lodgingPref" label="Pilihan akomodasi">
          <select
            id="lodgingPref"
            className="field-input"
            value={lodgingPref}
            onChange={(e) => setLodgingPref(e.target.value)}
          >
            {lodgingOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
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
              Kapasitas termasuk host. Titik temu tidak boleh menyalin asal.
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
          </div>
        ) : null}
      </div>

      {formError ? (
        <p className="type-body mt-3 text-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <Link href={tripDetailHref(tripId)} className="btn-ghost">
          Batal
        </Link>
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() => void save()}
        >
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </button>
      </div>
    </div>
  );
}

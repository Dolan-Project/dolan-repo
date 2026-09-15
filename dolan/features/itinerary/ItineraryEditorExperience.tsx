"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BudgetItemInput, EditableItineraryDay, EditableItineraryStop, ItineraryEditorSnapshot, TripChecklistItem } from "@dolan/shared";
import { Icon } from "@/components/ui/Icon";
<<<<<<< HEAD
import { findScheduleConflicts, generateAlternative, getItineraryEditor, saveItineraryVersion, selectItineraryVersion, upsertChecklistItem, deleteChecklistItem } from "./api";
import { INITIAL_BUDGET_ITEMS, PLACE_CANDIDATES } from "./mock-data";
import { RoutePreview } from "./RoutePreview";
=======
import { findScheduleConflicts, generateAlternative, getItineraryEditor, saveItineraryVersion, selectItineraryVersion } from "./api";
import { INITIAL_BUDGET_ITEMS } from "./mock-data";
>>>>>>> 13c57bd (style: redesign edit page)
import { SaveOfflineItineraryButton } from "@/components/offline/SaveOfflineItineraryButton";
import { CreateTripItineraryStep } from "@/components/trip/CreateTripItineraryStep";
import { ROUTES, tripItineraryPath } from "@/lib/routes";
import {
  appendVisitStop,
  availableBudgetPool,
  estimateItineraryBudget,
  packItinerarySchedule,
  placeFromTemplateStop,
  reorderStopsInDay,
  withGlobalStopNumbers,
} from "@/lib/template-itinerary";

type Notice = { tone: "success" | "error" | "info"; text: string } | null;

const clone = <T,>(value: T): T => structuredClone(value);

function normalize(days: EditableItineraryDay[]) {
  return withGlobalStopNumbers(days.map((day, dayIndex) => ({ ...day, dayNumber: dayIndex + 1 })));
}

function versionBudgetInputs(snapshot: ItineraryEditorSnapshot, versionId: string): BudgetItemInput[] {
  const items = snapshot.versions.find((item) => item.id === versionId)?.budget.items;
  if (!items?.length) return clone(INITIAL_BUDGET_ITEMS);
  return items.map(({ category, label, quantity, unit, unitCostLow, unitCostHigh, sourceType, sourceReference, notes }) => ({ category, label, quantity, unit, unitCostLow, unitCostHigh, sourceType, sourceReference, notes }));
}

export function ItineraryEditorExperience({ tripId }: { tripId: string }) {
  const router = useRouter();
  const publishIdempotencyKey = useMemo(() => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "00000000-0000-4000-8000-000000000001", []);
  const [snapshot, setSnapshot] = useState<ItineraryEditorSnapshot | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [days, setDays] = useState<EditableItineraryDay[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItemInput[]>(clone(INITIAL_BUDGET_ITEMS));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [packingTitle, setPackingTitle] = useState("");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [budgetBasis, setBudgetBasis] = useState<"PER_PERSON" | "GROUP">("GROUP");

  useEffect(() => {
<<<<<<< HEAD
    let cancelled = false;
    getItineraryEditor(tripId)
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        const versionId = data.activeVersionId || data.versions[0]?.id || "";
        setSelectedVersionId(versionId);
        const version = data.versions.find((item) => item.id === versionId);
        setDays(clone(version?.days ?? []));
        setBudgetItems(versionId ? versionBudgetInputs(data, versionId) : clone(INITIAL_BUDGET_ITEMS));
        if (!version) {
          setNotice({ tone: "info", text: "Belum ada versi itinerary. Generate atau tambah hari lalu simpan." });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setNotice({
          tone: "error",
          text: error instanceof Error ? error.message : "Gagal memuat itinerary.",
        });
      });
    return () => {
      cancelled = true;
    };
=======
    getItineraryEditor(tripId).then((data) => {
      setSnapshot(data);
      setSelectedVersionId(data.activeVersionId);
      const versionDays = clone(data.versions.find((item) => item.id === data.activeVersionId)!.days);
      setDays(versionDays);
      setSelectedStopId(versionDays[0]?.stops[0]?.id ?? null);
      const items = versionBudgetInputs(data, data.activeVersionId);
      setBudgetItems(items);
      const high = Number(data.versions.find((item) => item.id === data.activeVersionId)?.budget.totalHigh ?? 0);
      const itemTotal = items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.unitCostHigh || 0), 0);
      setBudgetAmount(high || itemTotal);
      setBudgetBasis(data.versions.find((item) => item.id === data.activeVersionId)?.budget.basis ?? "GROUP");
    });
>>>>>>> 13c57bd (style: redesign edit page)
  }, [tripId]);

  const conflicts = useMemo(() => findScheduleConflicts(days), [days]);
  const budgetPool = availableBudgetPool(budgetAmount, budgetBasis, 1);
  const livePlan = useMemo(() => estimateItineraryBudget(days, budgetPool, 1), [days, budgetPool]);
  const activeVersion = snapshot?.versions.find((item) => item.id === snapshot.activeVersionId);

  const changeDays = (next: EditableItineraryDay[]) => {
    setDays(normalize(next));
    setDirty(true);
    setNotice(null);
  };

  const updateStop = (dayId: string, stopId: string, patch: Partial<EditableItineraryStop>) => {
    const previous = days.flatMap((day) => day.stops).find((stop) => stop.id === stopId);
    const next = days.map((day) => day.id === dayId ? { ...day, stops: day.stops.map((stop) => stop.id === stopId ? { ...stop, ...patch } : stop) } : day);
    const placeChanged = Boolean(patch.place) && (
      previous?.place?.latitude !== patch.place?.latitude ||
      previous?.place?.longitude !== patch.place?.longitude ||
      Boolean(patch.customTitle && patch.customTitle !== (previous?.customTitle || previous?.place?.name))
    );
    changeDays(placeChanged ? packItinerarySchedule(next) : next);
  };

  const addDay = () => {
    const city = snapshot?.destinationCity ?? "Indonesia";
    const date = new Date(`${snapshot?.startDate ?? "2026-10-24"}T00:00:00`);
    date.setDate(date.getDate() + days.length);
    const nextDayNumber = days.length + 1;
    changeDays(packItinerarySchedule([...days, {
      id: `day-${nextDayNumber}`,
      dayNumber: nextDayNumber,
      date: date.toISOString().slice(0, 10),
      title: "Hari baru",
      stops: [{
        id: `day-${nextDayNumber}-stop-1`,
        sequence: 1,
        place: placeFromTemplateStop(city, city),
        customTitle: city,
        activityType: "Wisata",
        startTime: "08:00",
        durationMinutes: 90,
        travelDurationMinutes: 0,
        notes: null,
        isLocked: false,
      }],
    }]));
  };

  const save = async () => {
    if (!snapshot || Object.keys(conflicts).length) {
      setNotice({ tone: "error", text: "Masih ada jadwal yang bertumpuk. Perbaiki waktu yang ditandai." });
      return;
    }
    setSaving(true);
    try {
      const next = await saveItineraryVersion(snapshot, {
        baseVersionId: selectedVersionId,
        summary: "Perubahan itinerary dari editor My Trip",
        days: days.map((day) => ({
          ...day,
          stops: day.stops.map((stop) => ({
            ...stop,
            googlePlaceId: stop.place?.googlePlaceId ?? null,
            latitude: stop.place?.latitude,
            longitude: stop.place?.longitude,
          })),
        })),
        budgetItems,
      });
      setSnapshot(next);
      setSelectedVersionId(next.activeVersionId);
      setDirty(false);
      setNotice({ tone: "success", text: `Versi ${next.versions[0].versionNumber} tersimpan dan menjadi versi aktif.` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Gagal menyimpan itinerary." });
    } finally {
      setSaving(false);
    }
  };

  const generate = async (mode: "balanced" | "cheaper") => {
    if (!snapshot || generating) return;
    setGenerating(true);
    setNotice({
      tone: "info",
      text: mode === "cheaper" ? "AI sedang mencari rute yang lebih hemat sesuai budget terbaru." : "AI sedang merapikan urutan rute.",
    });
    try {
      const pool = String(budgetPool);
      const budgeted = {
        ...snapshot,
        versions: snapshot.versions.map((version) => (
          version.id === snapshot.activeVersionId
            ? { ...version, budget: { ...version.budget, basis: budgetBasis, totalLow: pool, totalHigh: pool } }
            : version
        )),
      };
      const next = await generateAlternative(budgeted, days, budgetItems, mode);
      const generated = next.snapshot.versions[0];
      setSnapshot(next.snapshot);
<<<<<<< HEAD
      setGeneratedVersionId(next.snapshot.versions[0]?.id ?? null);
      setJob(next.job
        ? { id: next.job.id, status: next.job.status, attemptCount: next.job.attemptCount, resultVersionId: next.job.resultVersionId, errorCode: next.job.errorCode }
        : { id: crypto.randomUUID(), status: "SUCCEEDED", attemptCount: 1, resultVersionId: next.snapshot.versions[0]?.id ?? null, errorCode: null });
      setNotice({ tone: "success", text: `Versi AI ${next.snapshot.versions[0]?.versionNumber ?? ""} siap ditinjau. Klik ?Jadikan aktif? jika kamu menyukainya.` });
    } catch (error) {
      setJob({ id: crypto.randomUUID(), status: "FAILED", attemptCount: 1, resultVersionId: null, errorCode: "GENERATION_FAILED" });
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Generate gagal. Draft dan versi aktif tidak berubah; silakan coba lagi.",
      });
=======
      if (generated) {
        setSelectedVersionId(generated.id);
        setDays(clone(generated.days));
        setSelectedStopId(generated.days[0]?.stops[0]?.id ?? null);
        setBudgetItems(versionBudgetInputs(next.snapshot, generated.id));
        setDirty(true);
      }
      setNotice({ tone: "success", text: generated?.summary || "Rute baru siap. Simpan jika kamu setuju." });
    } catch {
      setNotice({ tone: "error", text: "Generate gagal. Draft aktif tidak berubah." });
>>>>>>> 13c57bd (style: redesign edit page)
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    if (publishing || saving) return;
    if (dirty) {
      setNotice({ tone: "error", text: "Simpan perubahan itinerary sebelum memublikasikan trip." });
      return;
    }
    setPublishing(true);
    setNotice(null);
    try {
      const detailResponse = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}`, { credentials: "include" });
      const detail = await detailResponse.json() as { success: boolean; data?: { visibility: "PRIVATE" | "PUBLIC" }; error?: { message?: string } };
      if (!detailResponse.ok || !detail.success || !detail.data) throw new Error(detail.error?.message ?? "Detail trip tidak dapat dimuat.");
      const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "idempotency-key": publishIdempotencyKey },
        body: JSON.stringify({ confirmPublish: true, visibility: detail.data.visibility }),
      });
      const payload = await response.json() as { success: boolean; error?: { message?: string } };
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Trip gagal dipublikasikan.");
      setNotice({ tone: "success", text: detail.data.visibility === "PUBLIC" ? "Trip berhasil dipublikasikan dan dapat ditemukan traveler lain." : "Rencana private berhasil diselesaikan dan tetap hanya terlihat olehmu." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Trip gagal dipublikasikan." });
    } finally {
      setPublishing(false);
    }
  };

  const closeSlots = async () => {
    setPublishing(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/transition`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      const payload = await response.json() as { success: boolean; error?: { message?: string } };
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Slot gagal ditutup.");
      setNotice({ tone: "success", text: "Pengajuan peserta baru sudah ditutup." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Slot gagal ditutup." });
    } finally {
      setPublishing(false);
    }
  };

  const deleteDraft = async () => {
    if (!window.confirm("Hapus draft trip ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}`, { method: "DELETE", credentials: "include" });
      const payload = await response.json() as { success: boolean; error?: { message?: string } };
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Trip gagal dihapus.");
      router.push(ROUTES.tripSaya);
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Trip gagal dihapus." });
      setSaving(false);
    }
  };

  const chooseVersion = (versionId: string, activate = false) => {
    if (!snapshot) return;
    const version = snapshot.versions.find((item) => item.id === versionId);
    if (!version) return;
    setSelectedVersionId(versionId);
    setDays(clone(version.days));
    setSelectedStopId(version.days[0]?.stops[0]?.id ?? null);
    setBudgetItems(versionBudgetInputs(snapshot, versionId));
    setBudgetAmount(Number(version.budget.totalHigh) || 0);
    setBudgetBasis(version.budget.basis);
    setDirty(false);
    if (activate) {
      void selectItineraryVersion(snapshot.tripId, versionId).then((next) => {
        setSnapshot(next ?? { ...snapshot, activeVersionId: versionId });
      });
      setNotice({ tone: "success", text: `Versi ${version.versionNumber} sekarang menjadi itinerary aktif.` });
    }
  };

  if (!snapshot) return <div className="mx-auto max-w-6xl p-6"><div className="h-[70vh] animate-pulse rounded-[2rem] bg-surface-container" /></div>;

  return (
    <main className="min-h-screen bg-[#f7fbff]">
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-10">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
<<<<<<< HEAD
          <p className="type-micro uppercase tracking-[.16em] text-secondary">Trip saya ? Editor itinerary</p>
          <h1 className="type-title mt-1 md:text-[1.75rem]">{snapshot.tripTitle}</h1>
          <p className="type-body mt-1 text-on-surface-variant"><Icon name="location_on" /> {snapshot.destinationCity} ? {snapshot.startDate} ? {snapshot.endDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Pilih versi itinerary" value={selectedVersionId} onChange={(event) => chooseVersion(event.target.value)} className="min-h-11 rounded-full border border-outline-variant bg-white px-4 type-label outline-none focus:border-primary">
            {snapshot.versions.map((version) => <option key={version.id} value={version.id}>Versi {version.versionNumber} ? {version.source}{version.id === snapshot.activeVersionId ? " ? Aktif" : ""}</option>)}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Mode regenerate AI" value={regenerateMode} onChange={(event) => setRegenerateMode(event.target.value as typeof regenerateMode)} className="min-h-11 rounded-full border border-outline-variant bg-white px-4 type-label outline-none focus:border-primary">
              <option value="balanced">Regenerate biasa</option>
              <option value="cheaper">Alternatif hemat</option>
              <option value="alternative">Rute alternatif</option>
            </select>
            <button type="button" onClick={() => void generate()} disabled={generating} className="btn-primary"><Icon name="rocket_launch" /> {generating ? "Mengoptimalkan?" : "Optimalkan dengan AI"}</button>
          </div>
          <SaveOfflineItineraryButton
            id={tripId}
            title={snapshot.tripTitle}
            path={tripItineraryPath(tripId)}
          />
          <button type="button" onClick={() => void closeSlots()} disabled={publishing} className="rounded-full border border-outline-variant bg-white px-4 py-3 type-label text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-50"><Icon name="lock" /> Tutup Slot</button>
          <button type="button" onClick={() => void deleteDraft()} disabled={saving} className="rounded-full border border-error/30 bg-white px-4 py-3 type-label text-error hover:bg-error-container disabled:opacity-50"><Icon name="delete" /> Hapus Draft</button>
        </div>
      </header>

      {notice && <div role="status" className={`mb-4 rounded-2xl border px-4 py-3 type-label ${notice.tone === "error" ? "border-error/30 bg-error-container text-on-error-container" : notice.tone === "success" ? "border-success/30 bg-emerald-50 text-emerald-800" : "border-primary/20 bg-primary-fixed text-on-primary-fixed"}`}>{notice.text}{generatedVersionId && <><button type="button" className="ml-3 underline" onClick={() => chooseVersion(generatedVersionId)}>Tinjau versi</button><button type="button" className="ml-3 underline" onClick={() => chooseVersion(generatedVersionId, true)}>Jadikan aktif</button></>}</div>}
      {job && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-outline-variant bg-white px-4 py-3"><span className="type-label">Generation job <code className="text-xs text-on-surface-variant">{job.id}</code></span><span className={`chip ${job.status === "SUCCEEDED" ? "bg-emerald-50 text-emerald-800" : job.status === "FAILED" ? "bg-error-container text-error" : "bg-secondary-fixed text-secondary"}`}>{job.status === "PROCESSING" ? "Sedang diproses" : job.status === "SUCCEEDED" ? "Berhasil" : "Gagal"} ? percobaan {job.attemptCount}</span></div>}
=======
          <p className="type-micro font-extrabold uppercase tracking-[0.16em] text-primary">Edit rute</p>
          <h1 className="mt-1 text-2xl font-extrabold text-on-surface md:text-3xl">{snapshot.tripTitle}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{snapshot.destinationCity} · {snapshot.startDate} – {snapshot.endDate}</p>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white" onClick={() => setMenuOpen((open) => !open)} aria-label="Menu lain">
            <Icon name="more_vert" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
              <select aria-label="Pilih versi itinerary" value={selectedVersionId} onChange={(event) => chooseVersion(event.target.value)} className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {snapshot.versions.map((version) => <option key={version.id} value={version.id}>Versi {version.versionNumber}{version.id === snapshot.activeVersionId ? " · Aktif" : ""}</option>)}
              </select>
              <SaveOfflineItineraryButton id={tripId} title={snapshot.tripTitle} path={tripItineraryPath(tripId)} />
              <button type="button" className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm" onClick={() => void closeSlots()}>Tutup slot</button>
              <Link href={ROUTES.trip(tripId)} className="block rounded-xl px-3 py-2 text-sm text-on-surface">Lihat detail trip</Link>
              <button type="button" className="w-full rounded-xl px-3 py-2 text-left text-sm text-error" onClick={() => void deleteDraft()}>Hapus draft</button>
            </div>
          ) : null}
        </div>
      </header>

      {notice ? <p role="status" className={`mb-4 rounded-2xl px-4 py-3 text-sm ${notice.tone === "error" ? "bg-error-container text-on-error-container" : notice.tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-primary-fixed text-on-primary-fixed"}`}>{notice.text}</p> : null}
>>>>>>> 13c57bd (style: redesign edit page)

      <CreateTripItineraryStep
        days={days}
        selectedStopId={selectedStopId}
        editingStopId={editingStopId}
        generating={generating}
        fromTemplate={activeVersion?.source === "TEMPLATE"}
        regenerateUsed={0}
        unlimitedRegenerate
        budgetPlan={livePlan}
        partySize={1}
        isPublic={false}
        destinationCity={snapshot.destinationCity}
        budgetAmount={budgetAmount}
        budgetBasis={budgetBasis}
        heading="Edit itinerary"
        onBudgetAmountChange={(amount) => {
          setBudgetAmount(amount);
          setDirty(true);
        }}
        onBudgetBasisChange={(basis) => {
          setBudgetBasis(basis);
          setDirty(true);
        }}
        onSelectStop={(id) => {
          setSelectedStopId(id);
          setEditingStopId(id);
        }}
        onEditStop={(id) => {
          setSelectedStopId(id);
          setEditingStopId(id);
        }}
        onCloseEdit={() => setEditingStopId(null)}
        onReorderStops={(dayId, fromIndex, toIndex) => changeDays(reorderStopsInDay(days, dayId, fromIndex, toIndex))}
        onUpdateStop={updateStop}
        onAddStop={(dayId, pick) => changeDays(appendVisitStop(days, dayId, { ...pick, city: pick.city || snapshot.destinationCity, lock: true }))}
        onRemoveStop={(dayId, stopId) => changeDays(packItinerarySchedule(days.map((day) => day.id === dayId ? { ...day, stops: day.stops.filter((stop) => stop.id !== stopId) } : day)))}
        onAddDay={addDay}
        onRegenerate={() => void generate(livePlan.overBudget ? "cheaper" : "balanced")}
      />

      <div className="mt-5">
        <PackingEditor
          tripId={tripId}
          snapshot={snapshot}
          setSnapshot={(next) => { setSnapshot(next); setDirty(true); }}
          title={packingTitle}
          setTitle={setPackingTitle}
        />
      </div>

<<<<<<< HEAD
      <div className="grid gap-5 lg:grid-cols-[minmax(330px,.82fr)_minmax(520px,1.18fr)]">
        <RoutePreview days={days} destination={snapshot.destinationCity} />
        <section className="min-w-0">
          {tab === "itinerary" && <div className="space-y-4">
            {days.map((day) => <DayEditor key={day.id} day={day} conflicts={conflicts} onChangeTitle={(title) => changeDays(days.map((item) => item.id === day.id ? { ...item, title } : item))} onUpdateStop={(stopId, patch) => updateStop(day.id, stopId, patch)} onMove={(index, direction) => moveStop(day.id, index, direction)} onRemove={(stopId) => changeDays(days.map((item) => item.id === day.id ? { ...item, stops: item.stops.filter((stop) => stop.id !== stopId) } : item))} onAdd={(placeIndex) => addPlace(day.id, placeIndex)} onDeleteDay={() => day.stops.some((stop) => stop.isLocked) ? setNotice({ tone: "error", text: "Hari ini memiliki destinasi terkunci. Buka kunci sebelum menghapus hari." }) : changeDays(days.filter((item) => item.id !== day.id))} />)}
            <button type="button" onClick={addDay} className="w-full rounded-2xl border-2 border-dashed border-primary/25 bg-primary-fixed/30 py-4 type-label text-primary hover:bg-primary-fixed"><Icon name="add" /> Tambah hari perjalanan</button>
          </div>}
          {tab === "budget" && <BudgetEditor items={budgetItems} total={budgetTotal} onChange={(items) => { setBudgetItems(items); setDirty(true); }} />}
          {tab === "checklist" && <ChecklistEditor snapshot={snapshot} setSnapshot={setSnapshot} title={newChecklist} setTitle={setNewChecklist} setNotice={setNotice} />}
        </section>
      </div>

      <div className="fixed bottom-[74px] left-3 right-3 z-30 flex items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-white/95 p-3 shadow-[0_12px_40px_rgba(7,28,50,.22)] backdrop-blur md:static md:mt-5 md:ml-auto md:w-fit">
        <div className="hidden sm:block"><p className="type-label">{dirty ? "Ada perubahan belum tersimpan" : `Versi aktif: ${activeVersion?.versionNumber}`}</p><p className="type-caption text-on-surface-variant">Penyimpanan membuat versi baru.</p></div>
        <button type="button" onClick={save} disabled={saving || !dirty || Object.keys(conflicts).length > 0} className="btn-brand flex-1 md:flex-none"><Icon name="bookmark_added" /> {saving ? "Menyimpan?" : "Simpan versi baru"}</button>
        <button type="button" onClick={publish} disabled={publishing || saving || dirty || Object.keys(conflicts).length > 0} className="btn-primary flex-1 md:flex-none"><Icon name="publish" /> {publishing ? "Memublikasikan?" : "Publikasikan trip"}</button>
=======
      <div className="fixed bottom-4 left-3 right-3 z-30 flex items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur md:static md:mt-6 md:border-0 md:shadow-none">
        <p className="mr-auto hidden text-sm text-on-surface-variant sm:block">{dirty ? "Ada perubahan belum tersimpan" : "Rute tersimpan"}</p>
        <button type="button" onClick={save} disabled={saving || !dirty || Object.keys(conflicts).length > 0} className="btn-primary">
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
>>>>>>> 13c57bd (style: redesign edit page)
      </div>
    </div>
    </main>
  );
}

<<<<<<< HEAD
function DayEditor({ day, conflicts, onChangeTitle, onUpdateStop, onMove, onRemove, onAdd, onDeleteDay }: { day: EditableItineraryDay; conflicts: Record<string, string>; onChangeTitle: (value: string) => void; onUpdateStop: (id: string, patch: Partial<EditableItineraryStop>) => void; onMove: (index: number, direction: -1 | 1) => void; onRemove: (id: string) => void; onAdd: (index: number) => void; onDeleteDay: () => void }) {
  return <article className="rounded-[1.5rem] border border-outline-variant/70 bg-white p-4 shadow-sm md:p-5">
    <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-white"><span className="type-micro">HARI</span><strong className="-mt-1">{day.dayNumber}</strong></div><div className="min-w-0 flex-1"><input aria-label={`Judul hari ${day.dayNumber}`} value={day.title ?? ""} onChange={(e) => onChangeTitle(e.target.value)} className="w-full border-b border-transparent bg-transparent type-subtitle outline-none hover:border-outline-variant focus:border-primary" /><p className="type-caption mt-1 text-on-surface-variant">{day.date} ? {day.stops.length} destinasi</p></div><button type="button" onClick={onDeleteDay} className="rounded-full p-2 text-on-surface-variant hover:bg-error-container hover:text-error" aria-label={`Hapus hari ${day.dayNumber}`}><Icon name="close" /></button></div>
    <div className="mt-4 space-y-3">{day.stops.map((stop, index) => <div key={stop.id} className={`rounded-2xl border p-3 transition ${conflicts[stop.id] ? "border-error bg-error-container/25" : stop.isLocked ? "border-secondary-container/50 bg-secondary-fixed/20" : "border-outline-variant/70 bg-surface-container-low/45"}`}>
      <div className="relative flex items-start gap-3">
        {index < day.stops.length - 1 ? <span className="absolute bottom-0 left-[15px] top-10 w-0.5 bg-slate-300" aria-hidden="true" /> : null}
        <ItineraryStopPin index={index} sequence={index + 1} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="type-label-lg">{stop.place?.name ?? stop.customTitle}</h3>{stop.isLocked && <span className="chip bg-secondary-fixed text-secondary"><Icon name="lock" /> Dikunci</span>}</div><p className="type-caption text-on-surface-variant">{stop.place?.formattedAddress}</p></div><div className="flex"><button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} className="rounded-lg px-2 py-1 text-primary disabled:opacity-25" aria-label="Pindah ke atas">↑</button><button type="button" onClick={() => onMove(index, 1)} disabled={index === day.stops.length - 1} className="rounded-lg px-2 py-1 text-primary disabled:opacity-25" aria-label="Pindah ke bawah">↓</button></div></div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4"><label className="type-caption text-on-surface-variant">Mulai<input type="time" value={stop.startTime ?? ""} onChange={(e) => onUpdateStop(stop.id, { startTime: e.target.value })} className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-on-surface" /></label><label className="type-caption text-on-surface-variant">Durasi (menit)<input type="number" min="15" step="15" value={stop.durationMinutes} onChange={(e) => onUpdateStop(stop.id, { durationMinutes: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-on-surface" /></label><label className="type-caption text-on-surface-variant">Perjalanan<input type="number" min="0" step="5" value={stop.travelDurationMinutes ?? 0} onChange={(e) => onUpdateStop(stop.id, { travelDurationMinutes: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-on-surface" /></label><label className="type-caption text-on-surface-variant">Aktivitas<input value={stop.activityType} onChange={(e) => onUpdateStop(stop.id, { activityType: e.target.value })} className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-on-surface" /></label></div>
      <textarea aria-label={`Catatan ${stop.place?.name}`} placeholder="Catatan aktivitas?" value={stop.notes ?? ""} onChange={(e) => onUpdateStop(stop.id, { notes: e.target.value || null })} className="mt-2 min-h-16 w-full resize-y rounded-xl border border-outline-variant bg-white px-3 py-2 type-body outline-none focus:border-primary" />
      {conflicts[stop.id] && <p className="mt-1 type-caption font-semibold text-error">{conflicts[stop.id]}</p>}
      <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => onUpdateStop(stop.id, { isLocked: !stop.isLocked })} className="rounded-full border border-outline-variant px-3 py-1.5 type-label text-on-surface-variant"><Icon name="lock" /> {stop.isLocked ? "Buka kunci" : "Kunci"}</button><button type="button" disabled={stop.isLocked || day.stops.length === 1} onClick={() => onRemove(stop.id)} className="rounded-full px-3 py-1.5 type-label text-error hover:bg-error-container disabled:opacity-30">Hapus</button></div>
    </div>)}</div>
    <details className="mt-3"><summary className="cursor-pointer rounded-xl bg-primary-fixed px-3 py-2 type-label text-primary"><Icon name="add" /> Tambah destinasi</summary><div className="mt-2 flex flex-wrap gap-2">{PLACE_CANDIDATES.map((place, index) => <button key={place.googlePlaceId} type="button" onClick={() => onAdd(index)} className="rounded-full border border-outline-variant bg-white px-3 py-2 type-label hover:border-primary hover:text-primary">{place.name}</button>)}</div></details>
  </article>;
}

function BudgetEditor({ items, total, onChange }: { items: BudgetItemInput[]; total: number; onChange: (items: BudgetItemInput[]) => void }) {
  const update = (index: number, patch: Partial<BudgetItemInput>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const totalLow = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCostLow || 0), 0);
  return <div className="rounded-[1.5rem] border border-outline-variant/70 bg-white p-4 shadow-sm md:p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="type-micro uppercase text-secondary">Estimasi per peserta ? bukan biaya join</p><h2 className="type-title mt-1">Rencana budget</h2></div><div className="text-right"><p className="type-caption text-on-surface-variant">Rentang estimasi</p><strong className="type-subtitle text-primary">{money.format(totalLow)} ? {money.format(total)}</strong></div></div><p className="mt-2 rounded-xl bg-primary-fixed/50 px-3 py-2 type-caption text-on-primary-fixed">Nilai ini hanya preview. Server menghitung ulang subtotal dan total ketika versi disimpan.</p><div className="mt-4 space-y-3">{items.map((item, index) => <div key={`${item.label}-${index}`} className="rounded-2xl bg-surface-container-low p-3"><div className="mb-2 flex items-center justify-between"><span className="chip bg-white text-on-surface-variant">{item.category}</span><span className="type-caption text-on-surface-variant">Sumber: {item.sourceType} ? dicek saat simpan</span></div><div className="grid gap-2 md:grid-cols-[1.4fr_.7fr_1fr_1fr_auto]"><input value={item.label} onChange={(e) => update(index, { label: e.target.value })} aria-label="Nama biaya" className="rounded-xl border border-outline-variant bg-white px-3 py-2" /><input type="number" min="0" value={item.quantity} onChange={(e) => update(index, { quantity: e.target.value })} aria-label="Jumlah" className="rounded-xl border border-outline-variant bg-white px-3 py-2" /><input type="number" min="0" value={item.unitCostLow} onChange={(e) => update(index, { unitCostLow: e.target.value })} aria-label="Biaya minimum" className="rounded-xl border border-outline-variant bg-white px-3 py-2" /><input type="number" min="0" value={item.unitCostHigh} onChange={(e) => update(index, { unitCostHigh: e.target.value })} aria-label="Biaya maksimum" className="rounded-xl border border-outline-variant bg-white px-3 py-2" /><button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl px-3 text-error hover:bg-error-container" aria-label="Hapus biaya"><Icon name="close" /></button></div><p className="mt-2 type-caption text-on-surface-variant">{item.quantity} {item.unit} ? {money.format(Number(item.unitCostLow || 0))}?{money.format(Number(item.unitCostHigh || 0))}</p></div>)}</div><button type="button" onClick={() => onChange([...items, { category: "OTHER", label: "Biaya baru", quantity: "1", unit: "item", unitCostLow: "0", unitCostHigh: "0", sourceType: "USER", notes: null }])} className="mt-3 rounded-full border border-primary px-4 py-2 type-label text-primary"><Icon name="add" /> Tambah biaya</button></div>;
}

function ChecklistEditor({
  snapshot,
  setSnapshot,
  title,
  setTitle,
  setNotice,
}: {
  snapshot: ItineraryEditorSnapshot;
  setSnapshot: (snapshot: ItineraryEditorSnapshot) => void;
  title: string;
  setTitle: (value: string) => void;
  setNotice: (notice: Notice) => void;
}) {
  const done = snapshot.checklist.filter((item) => item.isCompleted).length;

  const toggleItem = async (item: (typeof snapshot.checklist)[number]) => {
    const optimistic = {
      ...snapshot,
      checklist: snapshot.checklist.map((entry) =>
        entry.id === item.id ? { ...entry, isCompleted: !entry.isCompleted } : entry,
      ),
    };
    setSnapshot(optimistic);
    try {
      const saved = await upsertChecklistItem(snapshot.tripId, {
        id: item.id,
        title: item.title,
        dueDate: item.dueDate,
        isCompleted: !item.isCompleted,
      });
      setSnapshot({
        ...optimistic,
        checklist: optimistic.checklist.map((entry) => (entry.id === item.id ? saved : entry)),
      });
    } catch (error) {
      setSnapshot(snapshot);
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Gagal memperbarui checklist.",
      });
    }
  };

  const removeItem = async (itemId: string) => {
    const previous = snapshot;
    setSnapshot({ ...snapshot, checklist: snapshot.checklist.filter((entry) => entry.id !== itemId) });
    try {
      await deleteChecklistItem(snapshot.tripId, itemId);
    } catch (error) {
      setSnapshot(previous);
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Gagal menghapus checklist.",
      });
    }
  };

  const addItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      const saved = await upsertChecklistItem(snapshot.tripId, {
        title: title.trim(),
        dueDate: null,
        isCompleted: false,
      });
      setSnapshot({ ...snapshot, checklist: [...snapshot.checklist, saved] });
      setTitle("");
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Gagal menambah checklist.",
      });
    }
  };

  return (
    <div className="rounded-[1.5rem] border border-outline-variant/70 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="type-micro uppercase text-secondary">Persiapan perjalanan</p>
          <h2 className="type-title mt-1">Checklist</h2>
        </div>
        <span className="chip bg-emerald-50 text-emerald-800">
          {done}/{snapshot.checklist.length} selesai
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {snapshot.checklist.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-surface-container-low p-3">
            <input
              type="checkbox"
              checked={item.isCompleted}
              onChange={() => void toggleItem(item)}
              className="h-5 w-5 accent-primary"
            />
            <span className={`flex-1 type-label ${item.isCompleted ? "text-on-surface-variant line-through" : ""}`}>
              {item.title}
              <small className="mt-0.5 block font-normal text-on-surface-variant">
                Tenggat {item.dueDate ?? "belum ditentukan"}
              </small>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                void removeItem(item.id);
              }}
              className="rounded-full p-2 text-error"
              aria-label="Hapus checklist"
            >
              <Icon name="close" />
            </button>
          </label>
        ))}
      </div>
      <form className="mt-4 flex gap-2" onSubmit={(e) => void addItem(e)}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tambah persiapan?"
          className="min-w-0 flex-1 rounded-full border border-outline-variant px-4 outline-none focus:border-primary"
        />
        <button className="btn-brand !min-h-10" type="submit">
          <Icon name="add" /> Tambah
        </button>
      </form>
    </div>
=======
async function persistChecklistItem(tripId: string, input: { id?: string; title: string; isCompleted?: boolean; dueDate?: string | null }) {
  const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/checklist`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: input.title, isCompleted: input.isCompleted ?? false, dueDate: input.dueDate ?? null, ...(input.id ? { id: input.id } : {}) }),
  });
  const payload = await response.json() as { success: boolean; data?: TripChecklistItem };
  return payload.success ? payload.data : undefined;
}

function PackingEditor({
  tripId,
  snapshot,
  setSnapshot,
  title,
  setTitle,
}: {
  tripId: string;
  snapshot: ItineraryEditorSnapshot;
  setSnapshot: (snapshot: ItineraryEditorSnapshot) => void;
  title: string;
  setTitle: (value: string) => void;
}) {
  async function addItem(value: string) {
    const next = value.trim();
    if (!next) {
      setTitle(" ");
      return;
    }
    const item = await persistChecklistItem(tripId, { title: next, isCompleted: false, dueDate: null });
    setSnapshot({
      ...snapshot,
      checklist: [...snapshot.checklist, item ?? { id: `pack-${Date.now()}`, title: next, dueDate: null, isCompleted: false }],
    });
    setTitle("");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-on-surface">Perlengkapan</p>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full bg-primary text-white"
          aria-label="Tambah perlengkapan"
          onClick={() => void addItem(title)}
        >
          <Icon name="add" />
        </button>
      </div>
      {snapshot.checklist.length === 0 && !title ? <p className="mt-2 type-caption text-on-surface-variant">Opsional. Ketuk + untuk menambah barang.</p> : null}
      <div className="mt-3 space-y-2">
        {snapshot.checklist.map((item) => (
          <label key={item.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={item.isCompleted}
              onChange={() => {
                const next = !item.isCompleted;
                setSnapshot({ ...snapshot, checklist: snapshot.checklist.map((entry) => entry.id === item.id ? { ...entry, isCompleted: next } : entry) });
                void persistChecklistItem(tripId, { id: item.id, title: item.title, isCompleted: next, dueDate: item.dueDate });
              }}
            />
            <span className={item.isCompleted ? "text-on-surface-variant line-through" : ""}>{item.title}</span>
          </label>
        ))}
        {title !== "" ? (
          <input
            className="field-input min-h-10 text-sm"
            autoFocus
            placeholder="Contoh: Powerbank"
            value={title.trimStart()}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || !title.trim()) return;
              event.preventDefault();
              void addItem(title);
            }}
          />
        ) : null}
      </div>
    </section>
>>>>>>> 13c57bd (style: redesign edit page)
  );
}

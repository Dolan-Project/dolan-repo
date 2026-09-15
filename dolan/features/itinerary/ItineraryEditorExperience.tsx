"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BudgetItemInput, EditableItineraryDay, EditableItineraryStop, EditorGenerationStatus, ItineraryEditorSnapshot } from "@dolan/shared";
import { Icon } from "@/components/ui/Icon";
import { findScheduleConflicts, generateAlternative, getItineraryEditor, saveItineraryVersion, selectItineraryVersion, upsertChecklistItem, deleteChecklistItem } from "./api";
import { INITIAL_BUDGET_ITEMS } from "./mock-data";
import { SaveOfflineItineraryButton } from "@/components/offline/SaveOfflineItineraryButton";
import { CreateTripItineraryStep } from "@/components/trip/CreateTripItineraryStep";
import { ROUTES, tripItineraryPath } from "@/lib/routes";
import {
  appendVisitStop,
  availableBudgetPool,
  estimateItineraryBudget,
  hydrateItineraryPlaces,
  packItinerarySchedule,
  reorderStopsInDay,
  toItinerarySaveDays,
  withGlobalStopNumbers,
} from "@/lib/template-itinerary";

type Tab = "itinerary" | "budget" | "checklist";
type Notice = { tone: "success" | "error" | "info"; text: string } | null;

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const clone = <T,>(value: T): T => structuredClone(value);

function normalize(days: EditableItineraryDay[], city = "") {
  return withGlobalStopNumbers(
    hydrateItineraryPlaces(days.map((day, dayIndex) => ({ ...day, dayNumber: dayIndex + 1 })), city),
  );
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
  const [tab, setTab] = useState<Tab>("itinerary");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [regenerateMode, setRegenerateMode] = useState<"balanced" | "cheaper" | "alternative">("balanced");
  const [generatedVersionId, setGeneratedVersionId] = useState<string | null>(null);
  const [job, setJob] = useState<EditorGenerationStatus | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [newChecklist, setNewChecklist] = useState("");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [budgetAmount, setBudgetAmount] = useState(2_000_000);
  const [budgetBasis, setBudgetBasis] = useState<"PER_PERSON" | "GROUP">("PER_PERSON");

  useEffect(() => {
    let cancelled = false;
    getItineraryEditor(tripId)
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        const versionId = data.activeVersionId || data.versions[0]?.id || "";
        setSelectedVersionId(versionId);
        const version = data.versions.find((item) => item.id === versionId);
        setDays(normalize(clone(version?.days ?? []), data.destinationCity));
        setBudgetItems(versionId ? versionBudgetInputs(data, versionId) : clone(INITIAL_BUDGET_ITEMS));
        setSelectedStopId(version?.days?.[0]?.stops[0]?.id ?? null);
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
  }, [tripId]);

  const conflicts = useMemo(() => findScheduleConflicts(days), [days]);
  const budgetPlan = useMemo(
    () => estimateItineraryBudget(days, availableBudgetPool(budgetAmount, budgetBasis, 2), 2),
    [days, budgetAmount, budgetBasis],
  );
  const budgetTotal = useMemo(() => budgetItems.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.unitCostHigh || 0), 0), [budgetItems]);
  const activeVersion = snapshot?.versions.find((item) => item.id === snapshot.activeVersionId);

  const changeDays = (next: EditableItineraryDay[]) => {
    setDays(normalize(next, snapshot?.destinationCity ?? ""));
    setDirty(true);
    setNotice(null);
  };

  const updateStop = (dayId: string, stopId: string, patch: Partial<EditableItineraryStop>) => {
    const next = days.map((day) => day.id === dayId ? { ...day, stops: day.stops.map((stop) => stop.id === stopId ? { ...stop, ...patch } : stop) } : day);
    changeDays(patch.place ? packItinerarySchedule(next) : next);
  };

  const addDay = () => {
    const date = new Date(`${snapshot?.startDate ?? "2026-10-24"}T00:00:00`);
    date.setDate(date.getDate() + days.length);
    const nextDayNumber = days.length + 1;
    changeDays([
      ...days,
      {
        id: `day-${nextDayNumber}`,
        dayNumber: nextDayNumber,
        date: date.toISOString().slice(0, 10),
        title: "Hari baru",
        stops: [
          {
            id: `day-${nextDayNumber}-stop-1`,
            sequence: 1,
            place: null,
            customTitle: "Destinasi baru",
            activityType: "Wisata",
            startTime: "09:00",
            durationMinutes: 60,
            travelDurationMinutes: 0,
            notes: null,
            isLocked: false,
          },
        ],
      },
    ]);
  };

  const save = async () => {
    if (!snapshot) return;
    const packed = packItinerarySchedule(days);
    if (Object.keys(findScheduleConflicts(packed)).length) {
      setNotice({ tone: "error", text: "Masih ada jadwal yang bertumpuk. Perbaiki waktu yang ditandai." });
      return;
    }
    setSaving(true);
    try {
      const next = await saveItineraryVersion(snapshot, {
        baseVersionId: selectedVersionId || snapshot.activeVersionId || "wizard-v1",
        summary: "Perubahan itinerary dari editor My Trip",
        days: toItinerarySaveDays(packed),
        budgetItems,
      });
      setSnapshot(next);
      setSelectedVersionId(next.activeVersionId);
      setDays(normalize(packed, snapshot.destinationCity));
      setDirty(false);
      setNotice({ tone: "success", text: `Versi ${next.versions[0].versionNumber} tersimpan dan menjadi versi aktif.` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Gagal menyimpan itinerary." });
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    if (!snapshot || generating) return;
    setGenerating(true);
    setJob({ id: crypto.randomUUID(), status: "PROCESSING", attemptCount: 1, resultVersionId: null, errorCode: null });
    setNotice({
      tone: "info",
      text: regenerateMode === "cheaper"
        ? "Groq sedang menyusun rute hemat. Draft aktif tetap aman."
        : "AI sedang mengoptimalkan rute. Draft aktif tetap aman.",
    });
    try {
      const next = await generateAlternative(snapshot, days, budgetItems, regenerateMode);
      setSnapshot(next.snapshot);
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
    setDays(normalize(clone(version.days), snapshot.destinationCity));
    setBudgetItems(versionBudgetInputs(snapshot, versionId));
    setDirty(false);
    if (activate) {
      void selectItineraryVersion(snapshot.tripId, versionId).then((next) => {
        setSnapshot(next ?? { ...snapshot, activeVersionId: versionId });
      });
      setGeneratedVersionId(null);
      setNotice({ tone: "success", text: `Versi ${version.versionNumber} sekarang menjadi itinerary aktif.` });
    }
  };

  if (!snapshot) return <div className="mx-auto max-w-[1440px] p-6"><div className="h-[70vh] animate-pulse rounded-[2rem] bg-surface-container" /></div>;

  return (
    <main className="mx-auto max-w-[1480px] px-4 pb-28 pt-5 md:px-8 md:pb-10">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
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

      <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-2xl bg-surface-container-low p-1.5">
        {([ ["itinerary", "Itinerary", "alt_route"], ["budget", "Budget", "payments"], ["checklist", "Checklist", "check_circle"] ] as const).map(([key, label, icon]) => <button key={key} type="button" onClick={() => setTab(key)} className={`flex min-h-10 min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-4 type-label transition ${tab === key ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:bg-white/60"}`}><Icon name={icon} /> {label}</button>)}
      </div>

      <div className="grid gap-5">
        <section className="min-w-0">
          {tab === "itinerary" ? (
            <CreateTripItineraryStep
              days={days}
              selectedStopId={selectedStopId}
              editingStopId={editingStopId}
              generating={generating}
              fromTemplate={false}
              regenerateUsed={0}
              budgetPlan={budgetPlan}
              partySize={2}
              isPublic={false}
              destinationCity={snapshot.destinationCity}
              budgetAmount={budgetAmount}
              budgetBasis={budgetBasis}
              heading="Edit itinerary"
              unlimitedRegenerate
              onBudgetAmountChange={setBudgetAmount}
              onBudgetBasisChange={setBudgetBasis}
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
              onAddStop={(dayId, place) => changeDays(appendVisitStop(days, dayId, { ...place, lock: true }))}
              onRemoveStop={(dayId, stopId) => changeDays(packItinerarySchedule(days.map((day) => day.id === dayId ? { ...day, stops: day.stops.filter((stop) => stop.id !== stopId) } : day)))}
              onAddDay={addDay}
              onRegenerate={() => void generate()}
            />
          ) : null}
          {tab === "budget" && <BudgetEditor items={budgetItems} total={budgetTotal} onChange={(items) => { setBudgetItems(items); setDirty(true); }} />}
          {tab === "checklist" && <ChecklistEditor snapshot={snapshot} setSnapshot={setSnapshot} title={newChecklist} setTitle={setNewChecklist} setNotice={setNotice} />}
        </section>
      </div>

      <div className="fixed bottom-[74px] left-3 right-3 z-30 flex items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-white/95 p-3 shadow-[0_12px_40px_rgba(7,28,50,.22)] backdrop-blur md:static md:mt-5 md:ml-auto md:w-fit">
        <div className="hidden sm:block"><p className="type-label">{dirty ? "Ada perubahan belum tersimpan" : `Versi aktif: ${activeVersion?.versionNumber}`}</p><p className="type-caption text-on-surface-variant">Penyimpanan membuat versi baru.</p></div>
        <button type="button" onClick={save} disabled={saving || !dirty || Object.keys(conflicts).length > 0} className="btn-brand flex-1 md:flex-none"><Icon name="bookmark_added" /> {saving ? "Menyimpan?" : "Simpan versi baru"}</button>
        <button type="button" onClick={publish} disabled={publishing || saving || dirty || Object.keys(conflicts).length > 0} className="btn-primary flex-1 md:flex-none"><Icon name="publish" /> {publishing ? "Memublikasikan?" : "Publikasikan trip"}</button>
      </div>
    </main>
  );
}

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
  );
}

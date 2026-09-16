"use client";

import { useState, type ReactNode } from "react";
import type { EditableItineraryDay, EditableItineraryStop } from "@dolan/shared";
import { PlacePicker } from "@/components/trip/PlacePicker";
import { TripBoardMap } from "@/components/trip/TripBoardMap";
import { Icon } from "@/components/ui/Icon";
import {
  canRegenerate,
  formatRupiah,
  itineraryMapMarkers,
  itineraryMapRouteGroups,
  placeSummaryFromPick,
  remainingRegenerates,
  withGlobalStopNumbers,
  type ItineraryBudgetPlan,
  type PickedVisitPlace,
} from "@/lib/template-itinerary";
import { ITINERARY_ROUTE_COLOR, itineraryStopColor } from "@/lib/itinerary-style";
import { ItineraryStopPin } from "@/components/trip/ItineraryTimeline";
import { encodedRoutePolylines } from "@/lib/route-travel";
import {
  activityTypeLabel,
  formatItineraryDateRange,
  formatTravelToStop,
  stopDescription,
  stopDisplayNumber,
  stopPinColorIndex,
  stopPlaceHeading,
  visitWindowSummary,
} from "@/lib/itinerary-stop-view";
import { searchGeoPlaces } from "@/mocks/geo";

const BUDGET_PRESETS = [750_000, 1_500_000, 2_500_000, 5_000_000];

function foodMealLabel(detail?: string) {
  const value = (detail ?? "").toLocaleLowerCase("id-ID");
  if (/camilan|gorengan|es kelapa|teh manis|jajan/.test(value)) return "Makan (jajan)";
  if (/siang/.test(value)) return "Makan (siang)";
  if (/malam/.test(value)) return "Makan (malam)";
  if (/sarapan|pagi|bubur|nasi uduk/.test(value)) return "Makan (pagi)";
  return "Makan";
}

function resolveVisitPick(query: string, destinationCity: string): PickedVisitPlace | null {
  const name = query.trim();
  if (!name) return null;
  const hit = searchGeoPlaces(name)[0];
  if (hit) {
    const needle = name.toLocaleLowerCase("id-ID");
    const label = hit.label.toLocaleLowerCase("id-ID");
    const city = hit.city.toLocaleLowerCase("id-ID");
    if (label === needle || city === needle || label.startsWith(needle) || city.startsWith(needle) || (needle.length >= 4 && label.includes(needle))) {
      return { name: hit.label, city: hit.city || destinationCity, latitude: hit.latitude, longitude: hit.longitude };
    }
  }
  return { name, city: destinationCity };
}

type CreateTripItineraryStepProps = {
  days: EditableItineraryDay[];
  selectedStopId: string | null;
  editingStopId: string | null;
  generating: boolean;
  fromTemplate: boolean;
  fromGroq?: boolean;
  regenerateUsed: number;
  budgetPlan: ItineraryBudgetPlan;
  partySize: number;
  isPublic: boolean;
  destinationCity: string;
  budgetAmount?: number;
  budgetBasis?: "PER_PERSON" | "GROUP";
  budgetWarning?: string;
  heading?: string;
  onSelectStop: (id: string) => void;
  onEditStop: (id: string) => void;
  onCloseEdit: () => void;
  onReorderStops: (dayId: string, fromIndex: number, toIndex: number) => void;
  onUpdateStop: (dayId: string, stopId: string, patch: Partial<EditableItineraryStop>) => void;
  onRegenerate: () => void;
  onBudgetAmountChange?: (amount: number) => void;
  onBudgetBasisChange?: (basis: "PER_PERSON" | "GROUP") => void;
  onAddStop?: (dayId: string, place: PickedVisitPlace) => void;
  onRemoveStop?: (dayId: string, stopId: string) => void;
  onAddDay?: () => void;
  unlimitedRegenerate?: boolean;
  mapFooter?: ReactNode;
};

function DayRouteFilters({
  days,
  value,
  onChange,
}: {
  days: Array<{ id: string; dayNumber: number }>;
  value: string;
  onChange: (next: "all" | string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter hari">
      <button
        type="button"
        role="tab"
        aria-selected={value === "all"}
        className={`min-h-9 shrink-0 rounded-full px-3.5 type-caption font-bold ${value === "all" ? "bg-primary text-white" : "bg-slate-100 text-on-surface"}`}
        onClick={() => onChange("all")}
      >
        Semua
      </button>
      {days.map((day) => (
        <button
          key={day.id}
          type="button"
          role="tab"
          aria-selected={value === day.id}
          className={`min-h-9 shrink-0 rounded-full px-3.5 type-caption font-bold ${value === day.id ? "bg-primary text-white" : "bg-slate-100 text-on-surface"}`}
          onClick={() => onChange(day.id)}
        >
          Hari {day.dayNumber}
        </button>
      ))}
    </div>
  );
}

export function CreateTripItineraryStep({
  days,
  selectedStopId,
  editingStopId,
  generating,
  fromTemplate,
  fromGroq = false,
  regenerateUsed,
  budgetPlan,
  partySize,
  isPublic,
  destinationCity,
  budgetAmount,
  budgetBasis = "PER_PERSON",
  budgetWarning,
  heading,
  onSelectStop,
  onEditStop,
  onCloseEdit,
  onReorderStops,
  onUpdateStop,
  onRegenerate,
  onBudgetAmountChange,
  onBudgetBasisChange,
  onAddStop,
  onRemoveStop,
  onAddDay,
  unlimitedRegenerate = false,
  mapFooter,
}: CreateTripItineraryStepProps) {
  const [drag, setDrag] = useState<{ dayId: string; index: number } | null>(null);
  const [addingDayId, setAddingDayId] = useState<string | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState<"all" | string>("all");
  const numberedDays = withGlobalStopNumbers(days);
  const mappedDays = routeFilter === "all" ? numberedDays : numberedDays.filter((day) => day.id === routeFilter);
  const visibleDays = mappedDays.length ? mappedDays : numberedDays;
  const markers = itineraryMapMarkers(visibleDays, selectedStopId ?? editingStopId, destinationCity);
  const routeGroups = itineraryMapRouteGroups(visibleDays, destinationCity);
  const leftover = remainingRegenerates(regenerateUsed);
  const editing = numberedDays.flatMap((day) => day.stops.map((stop) => ({ day, stop }))).find((item) => item.stop.id === editingStopId);
  const usedPercent = budgetPlan.pool > 0 ? Math.min(100, Math.round((budgetPlan.total / budgetPlan.pool) * 100)) : 0;
  const showBudgetEditor = Boolean(onBudgetAmountChange) && typeof budgetAmount === "number";
  const roadPolylines = encodedRoutePolylines(visibleDays);

  function commitAdd(dayId: string, pick: PickedVisitPlace | null) {
    if (!onAddStop || !pick) return;
    onAddStop(dayId, pick);
    setAddQuery("");
    setAddingDayId(null);
  }

  return (
    <div className="grid gap-4 bg-white lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.78fr)] lg:items-start">
      <div className="flex flex-col bg-white p-4 pb-28 md:p-5 lg:pb-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="type-micro font-extrabold uppercase tracking-[0.16em] text-primary">Rute, biaya & penjelasan</p>
            <h2 className="mt-1 text-lg font-extrabold text-on-surface">
              {heading || (fromTemplate
                ? "Itinerary dari template"
                : fromGroq
                  ? "Itinerary dari Dolan"
                  : "Itinerary + perkiraan biaya")}
            </h2>
            <p className="type-caption mt-1 text-on-surface-variant">
              {fromTemplate
                ? "Rute kurasi Dolan. Bisa diedit sebelum lanjut."
                : fromGroq
                  ? "Ini usulan Dolan. Silakan ubah kalau ada yang kurang pas."
                  : "Nomor di daftar sama dengan pin di peta."}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-cyan-400 px-4 py-2 text-xs font-extrabold text-cyan-950 shadow-[0_8px_18px_rgba(34,211,238,0.38)] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={generating || (!unlimitedRegenerate && !canRegenerate(regenerateUsed))}
            onClick={onRegenerate}
          >
            <Icon name="auto_awesome" className="text-[16px]" />
            {generating ? "Dolan sedang merapikan…" : unlimitedRegenerate ? "Susun ulang" : leftover > 0 ? `Susun ulang (${leftover}x)` : "Batas susun ulang"}
          </button>
        </div>
        {numberedDays.length > 0 ? (
          <div className="mb-3">
            <DayRouteFilters days={numberedDays} value={routeFilter} onChange={setRouteFilter} />
          </div>
        ) : null}
        {budgetWarning ? (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 type-caption font-bold text-rose-800" role="alert">
            {budgetWarning}
          </p>
        ) : null}
        <div className={`mb-3 rounded-xl border bg-white px-3 py-2.5 ${budgetPlan.overBudget ? "border-orange-200" : "border-slate-200"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`type-caption font-bold ${budgetPlan.overBudget ? "text-secondary" : "text-primary"}`}>
              {budgetPlan.overBudget ? "Estimasi melebihi budget, simpan tetap bisa" : `Budget terpakai ${usedPercent}%`}
            </p>
            <p className="type-caption font-bold text-on-surface">{formatRupiah(budgetPlan.total)} / {formatRupiah(budgetPlan.pool)}</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${budgetPlan.overBudget ? "bg-secondary" : "bg-primary"}`} style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="type-caption mt-2 text-on-surface">
            {formatRupiah(budgetPlan.total)} / {partySize} orang
            {budgetPlan.overBudget
              ? ` · lebih ${formatRupiah(Math.abs(budgetPlan.remaining))}`
              : ` · sisa ${formatRupiah(Math.max(0, budgetPlan.remaining))}`}
          </p>
          {showBudgetEditor ? (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="type-caption font-extrabold text-on-surface">Ubah budget</p>
                {onBudgetBasisChange ? (
                  <div className="flex rounded-full bg-slate-100 p-0.5">
                    <button type="button" className={`rounded-full px-2.5 py-1 type-caption ${budgetBasis === "PER_PERSON" ? "bg-primary text-white" : "text-on-surface-variant"}`} onClick={() => onBudgetBasisChange("PER_PERSON")}>Per orang</button>
                    <button type="button" className={`rounded-full px-2.5 py-1 type-caption ${budgetBasis === "GROUP" ? "bg-primary text-white" : "text-on-surface-variant"}`} onClick={() => onBudgetBasisChange("GROUP")}>Rombongan</button>
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 type-label text-primary">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Nominal budget"
                  className="field-input min-h-10 pl-12 text-sm"
                  value={budgetAmount.toLocaleString("id-ID")}
                  onChange={(event) => onBudgetAmountChange?.(Number(event.target.value.replace(/\D/g, "")) || 0)}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {BUDGET_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => onBudgetAmountChange?.(amount)}
                    className={`rounded-full px-3 py-1.5 type-caption ${budgetAmount === amount ? "bg-primary text-white" : "bg-slate-100 text-on-surface"}`}
                  >
                    {formatRupiah(amount)}
                  </button>
                ))}
              </div>
              <p className="type-caption mt-2 text-on-surface-variant">
                Regenerasi memakai budget terbaru ini.
              </p>
            </div>
          ) : null}
        </div>
        <div className="space-y-3">
          {visibleDays.map((day) => {
            const dayTotal = day.stops.reduce((sum, stop) => sum + (budgetPlan.byStopId[stop.id]?.total ?? 0), 0);
            return (
            <section key={day.id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="type-micro font-bold text-primary">Hari {day.dayNumber}, {formatItineraryDateRange(day.date, day.date)}</p>
                  <p className="type-caption mt-0.5 font-bold text-on-surface">{day.title || "Rencana harian"}</p>
                </div>
                <p className="type-caption font-extrabold text-primary">{formatRupiah(dayTotal)}</p>
              </div>
              <ol className="relative mt-2">
                {day.stops.map((stop, index) => {
                  const active = stop.id === selectedStopId || stop.id === editingStopId;
                  const cost = budgetPlan.byStopId[stop.id];
                  const meeting = isPublic && day.dayNumber === 1 && index === 0;
                  const last = index === day.stops.length - 1;
                  const placeValue = stop.customTitle ?? stop.place?.name ?? "";
                  const pinNumber = stopDisplayNumber(stop, index);
                  const pinIndex = stopPinColorIndex(stop, index);
                  const heading = stopPlaceHeading(stop);
                  const visit = visitWindowSummary(stop.startTime, stop.durationMinutes);
                  const travelLabel = formatTravelToStop(stop, day.stops[index - 1], index === 0);
                  const description = stopDescription(stop);
                  const ticketLine = cost?.lines.find((line) => line.key === "ticket");
                  const transportLine = cost?.lines.find((line) => line.key === "transport");
                  const foodLine = cost?.lines.find((line) => line.key === "food");
                  return (
                    <li
                      key={stop.id}
                      className="relative overflow-visible"
                      onDragOver={(event) => {
                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!drag || drag.dayId !== day.id) return;
                        onReorderStops(day.id, drag.index, index);
                        setDrag(null);
                      }}
                    >
                      <div className="grid grid-cols-[2rem_2rem_minmax(0,1fr)] items-stretch gap-x-2 bg-white px-1">
                        <button
                          type="button"
                          className="mt-3 grid h-8 w-8 shrink-0 cursor-grab place-items-center rounded-lg text-on-surface-variant active:cursor-grabbing"
                          draggable
                          aria-label="Seret untuk mengubah urutan"
                          onDragStart={() => setDrag({ dayId: day.id, index })}
                          onDragEnd={() => setDrag(null)}
                        >
                          <Icon name="drag_handle" className="text-[18px]" />
                        </button>
                        <div className="relative flex justify-center">
                          {!last ? (
                            <span
                              className={`absolute left-1/2 z-0 w-[3px] -translate-x-1/2 ${index === 0 ? "top-7" : "top-0"} bottom-0`}
                              style={{ backgroundColor: itineraryStopColor(pinIndex) }}
                              aria-hidden="true"
                            />
                          ) : index > 0 ? (
                            <span
                              className="absolute left-1/2 top-0 z-0 h-7 w-[3px] -translate-x-1/2"
                              style={{ backgroundColor: itineraryStopColor(stopPinColorIndex(day.stops[index - 1]!, index - 1)) }}
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative z-10 mt-3">
                            <ItineraryStopPin
                              index={pinIndex}
                              sequence={pinNumber}
                              selected={active}
                              shape="circle"
                              halo={false}
                            />
                          </div>
                        </div>
                        <div className="min-w-0 bg-white py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {meeting ? <p className="mb-1 inline-flex rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Titik kumpul</p> : null}
                              <p className="text-sm font-extrabold leading-snug text-on-surface">{heading.name || "Titik rute"}</p>
                              {heading.subLocation ? (
                                <p className="type-caption mt-0.5 text-on-surface-variant">{heading.subLocation}</p>
                              ) : null}
                            </div>
                            <p className="shrink-0 text-sm font-extrabold text-primary">
                              {cost && cost.total > 0 ? formatRupiah(cost.total) : "Gratis"}
                            </p>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {visit.window ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 type-caption font-bold text-on-surface">
                                {visit.window}
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 type-caption font-bold text-on-surface">
                                {visit.label}
                              </span>
                            )}
                            {travelLabel ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 type-caption font-bold text-on-surface">
                                {travelLabel}
                              </span>
                            ) : null}
                            {activityTypeLabel(stop.activityType) !== "Kunjungan" ? (
                              <span className="rounded-full bg-primary/10 px-2.5 py-1 type-caption font-bold text-primary">
                                {activityTypeLabel(stop.activityType)}
                              </span>
                            ) : null}
                          </div>
                          {(() => {
                            const costRows = [
                              ticketLine ? { key: "ticket", label: "Tiket", amount: ticketLine.amount } : null,
                              transportLine && transportLine.amount > 0
                                ? { key: "transport", label: "Transportasi", amount: transportLine.amount }
                                : null,
                              foodLine
                                ? { key: "food", label: foodLine.label || foodMealLabel(foodLine.detail), amount: foodLine.amount }
                                : null,
                            ].filter((row): row is { key: string; label: string; amount: number } => Boolean(row));
                            if (!costRows.length && !description) return null;
                            return (
                              <div className="mt-2 rounded-lg border border-slate-200 bg-white py-1">
                                {costRows.map((row, rowIndex) => {
                                  const showDivider = rowIndex < costRows.length - 1 || Boolean(description);
                                  return (
                                    <div key={row.key}>
                                      <p className="flex items-baseline justify-between gap-3 px-3 py-2 type-caption text-on-surface">
                                        <span>{row.label}</span>
                                        <span className="shrink-0 font-extrabold">{formatRupiah(row.amount)}</span>
                                      </p>
                                      {showDivider ? <div className="mx-3 border-b border-slate-200" aria-hidden="true" /> : null}
                                    </div>
                                  );
                                })}
                                {description ? (
                                  <p className="px-3 py-2 type-caption text-on-surface-variant">{description}</p>
                                ) : null}
                              </div>
                            );
                          })()}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <button type="button" className="btn-ghost !min-h-8 !px-2.5 !text-xs" onClick={() => onEditStop(stop.id)}>
                              <Icon name="edit" className="text-[16px]" />
                              Edit
                            </button>
                            {onRemoveStop && day.stops.length > 1 ? (
                              <button type="button" className="btn-ghost !min-h-8 !px-2.5 !text-xs" onClick={() => onRemoveStop(day.id, stop.id)}>
                                <Icon name="delete" className="text-[16px]" />
                                Hapus
                              </button>
                            ) : null}
                          </div>
                          {editingStopId === stop.id && editing ? (
                            <div className="relative z-30 mt-2 space-y-2 overflow-visible rounded-xl border border-slate-200 bg-white p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="type-caption font-bold text-primary">Edit itinerary</p>
                                <button type="button" className="btn-ghost !min-h-8 !px-2 !text-xs" onClick={onCloseEdit}>Tutup</button>
                              </div>
                              <PlacePicker
                                id={`edit-place-${stop.id}`}
                                label="Nama tempat"
                                value={placeValue}
                                nearbyCity={destinationCity}
                                kind="place"
                                autoSelectOnBlur={false}
                                hint="Ketik nama wisata, lalu pilih dari daftar supaya peta ikut pindah."
                                placeholder="Cari destinasi, misalnya Kota Tua"
                                onChange={(next) => onUpdateStop(editing.day.id, editing.stop.id, { customTitle: next })}
                                onSelectPlace={(geo) => onUpdateStop(editing.day.id, editing.stop.id, {
                                  customTitle: geo.label,
                                  place: placeSummaryFromPick({
                                    name: geo.label,
                                    city: geo.city || destinationCity,
                                    latitude: geo.latitude,
                                    longitude: geo.longitude,
                                    googlePlaceId: geo.id,
                                  }),
                                })}
                              />
                              <div className="grid gap-2 sm:grid-cols-2">
                                <label className="block">
                                  <span className="type-caption text-on-surface-variant">Mulai</span>
                                  <input
                                    className="field-input mt-1 min-h-10 text-sm"
                                    type="time"
                                    value={editing.stop.startTime ?? ""}
                                    onChange={(event) => onUpdateStop(editing.day.id, editing.stop.id, { startTime: event.target.value })}
                                  />
                                </label>
                                <label className="block">
                                  <span className="type-caption text-on-surface-variant">Durasi (menit)</span>
                                  <input
                                    className="field-input mt-1 min-h-10 text-sm"
                                    type="number"
                                    min={15}
                                    value={editing.stop.durationMinutes}
                                    onChange={(event) => onUpdateStop(editing.day.id, editing.stop.id, { durationMinutes: Number(event.target.value) })}
                                  />
                                </label>
                              </div>
                              <label className="block">
                                <span className="type-caption text-on-surface-variant">Catatan</span>
                                <textarea
                                  className="field-input mt-1 min-h-20 text-sm"
                                  value={editing.stop.notes ?? ""}
                                  onChange={(event) => onUpdateStop(editing.day.id, editing.stop.id, { notes: event.target.value })}
                                />
                              </label>
                              <label className="flex items-center gap-2 type-caption text-on-surface">
                                <input
                                  type="checkbox"
                                  checked={editing.stop.isLocked}
                                  onChange={(event) => onUpdateStop(editing.day.id, editing.stop.id, { isLocked: event.target.checked })}
                                />
                                Pertahankan saat Dolan susun ulang
                              </label>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              {onAddStop ? (
                <div className="mt-2">
                  {addingDayId === day.id ? (
                    <div className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-white p-3">
                      <PlacePicker
                        id={`add-place-${day.id}`}
                        label="Tambah wisata sendiri"
                        value={addQuery}
                        nearbyCity={destinationCity}
                        kind="place"
                        hint="Pilih dari saran supaya titik muncul di peta."
                        placeholder="Cari atau ketik nama tempat"
                        onChange={setAddQuery}
                        onSelectPlace={(geo) => commitAdd(day.id, {
                          name: geo.label,
                          city: geo.city || destinationCity,
                          latitude: geo.latitude,
                          longitude: geo.longitude,
                          googlePlaceId: geo.id,
                        })}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-primary !min-h-9 !px-3 !text-xs"
                          disabled={!addQuery.trim()}
                          onClick={() => commitAdd(day.id, resolveVisitPick(addQuery, destinationCity))}
                        >
                          Tambahkan
                        </button>
                        <button
                          type="button"
                          className="btn-ghost !min-h-9 !px-3 !text-xs"
                          onClick={() => {
                            setAddingDayId(null);
                            setAddQuery("");
                          }}
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost !min-h-9 w-full !justify-center !text-xs"
                      onClick={() => {
                        setAddingDayId(day.id);
                        setAddQuery("");
                      }}
                    >
                      <Icon name="add" className="text-[16px]" />
                      Tambah wisata sendiri
                    </button>
                  )}
                </div>
              ) : null}
            </section>
            );
          })}
          {onAddDay ? (
            <button type="button" onClick={onAddDay} className="w-full rounded-2xl border border-dashed border-slate-300 bg-white py-3 text-sm font-bold text-primary">
              <Icon name="add" /> Tambah hari
            </button>
          ) : null}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:sticky lg:top-24">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon name="map" className="text-[20px] text-primary" />
            <div>
              <p className="type-caption font-bold text-on-surface">Peta rute</p>
              <p className="type-caption text-on-surface-variant">Nomor pin sama dengan daftar.</p>
            </div>
          </div>
          {numberedDays.length > 0 ? (
            <div className="mt-3">
              <DayRouteFilters days={numberedDays} value={routeFilter} onChange={setRouteFilter} />
            </div>
          ) : null}
        </div>
        <div className="h-[280px] bg-white md:h-[340px] lg:h-[420px]">
          {markers.length > 0 ? (
            <TripBoardMap markers={markers} onSelect={onSelectStop} routeColor={ITINERARY_ROUTE_COLOR} numberedBadges routeGroups={routeGroups} encodedPolylines={roadPolylines} routeUnavailable={false} />
          ) : (
            <div className="grid h-full place-items-center bg-white px-6 text-center">
              <p className="type-caption text-on-surface-variant">
                {generating ? "Tunggu sebentar, Dolan sedang menyusun itinerary-mu…" : "Rute belum punya koordinat. Minta Dolan susun dulu, atau pilih template."}
              </p>
            </div>
          )}
        </div>
        {mapFooter ? <div className="hidden border-t border-slate-200 bg-white p-3 lg:block">{mapFooter}</div> : null}
      </div>
      {mapFooter ? (
        <div className="fixed bottom-[74px] left-3 right-3 z-30 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_12px_40px_rgba(7,28,50,.18)] backdrop-blur lg:hidden">
          {mapFooter}
        </div>
      ) : null}
    </div>
  );
}

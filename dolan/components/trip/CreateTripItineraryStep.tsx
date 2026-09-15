"use client";

import { useState } from "react";
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
  visitWindowLabel,
  type ItineraryBudgetPlan,
  type PickedVisitPlace,
} from "@/lib/template-itinerary";
import { ITINERARY_ROUTE_COLOR, itineraryStopColor } from "@/lib/itinerary-style";
import { ItineraryStopPin } from "@/components/trip/ItineraryTimeline";
import { searchGeoPlaces } from "@/mocks/geo";

const BUDGET_PRESETS = [750_000, 1_500_000, 2_500_000, 5_000_000];

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
};

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
}: CreateTripItineraryStepProps) {
  const [drag, setDrag] = useState<{ dayId: string; index: number } | null>(null);
  const [addingDayId, setAddingDayId] = useState<string | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const [routeFilter, setRouteFilter] = useState<"all" | string>("all");
  const mappedDays = routeFilter === "all" ? days : days.filter((day) => day.id === routeFilter);
  const visibleDays = mappedDays.length ? mappedDays : days;
  const markers = itineraryMapMarkers(visibleDays, selectedStopId ?? editingStopId, destinationCity);
  const routeGroups = itineraryMapRouteGroups(visibleDays, destinationCity);
  const leftover = remainingRegenerates(regenerateUsed);
  const editing = days.flatMap((day) => day.stops.map((stop) => ({ day, stop }))).find((item) => item.stop.id === editingStopId);
  const usedPercent = budgetPlan.pool > 0 ? Math.min(100, Math.round((budgetPlan.total / budgetPlan.pool) * 100)) : 0;
  const showBudgetEditor = Boolean(onBudgetAmountChange) && typeof budgetAmount === "number";

  function commitAdd(dayId: string, pick: PickedVisitPlace | null) {
    if (!onAddStop || !pick) return;
    onAddStop(dayId, pick);
    setAddQuery("");
    setAddingDayId(null);
  }

  return (
    <div className="grid gap-4 bg-white lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.78fr)] lg:items-start">
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="type-micro font-extrabold uppercase tracking-[0.16em] text-primary">Rute, biaya & penjelasan</p>
            <h2 className="mt-1 text-lg font-extrabold text-on-surface">
              {heading || (fromTemplate
                ? "Itinerary dari template"
                : fromGroq
                  ? "Rekomendasi itinerary Groq"
                  : "Itinerary + estimasi AI")}
            </h2>
            <p className="type-caption mt-1 text-on-surface-variant">
              {fromTemplate
                ? "Rute kurasi DOLAN. Kamu bisa ganti tempat, jam, atau urutan per hari sebelum lanjut."
                : fromGroq
                  ? "Disusun Groq dari destinasi, tanggal, jumlah orang, dan budget. Edit manual jika ada tempat yang tidak cocok."
                  : "Angka 1-2-3 satu garis rute. Tiket hanya muncul kalau tempat memang berbayar — Bundaran HI dan ruang publik tetap gratis."}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost !min-h-9 !px-3 !text-xs"
            disabled={generating || (!unlimitedRegenerate && !canRegenerate(regenerateUsed))}
            onClick={onRegenerate}
          >
            {generating ? "Mengoptimalkan…" : unlimitedRegenerate ? "Regenerate" : leftover > 0 ? `Regenerate (${leftover}x)` : "Batas regenerate"}
          </button>
        </div>
        {budgetWarning ? (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 type-caption font-bold text-rose-800" role="alert">
            {budgetWarning}
          </p>
        ) : null}
        <div className={`mb-3 rounded-xl border bg-white px-3 py-2.5 ${budgetPlan.overBudget ? "border-orange-200" : "border-slate-200"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`type-caption font-bold ${budgetPlan.overBudget ? "text-secondary" : "text-primary"}`}>
              {budgetPlan.overBudget ? "Estimasi melebihi budget" : `Budget terpakai ${usedPercent}%`}
            </p>
            <p className="type-caption font-bold text-on-surface">{formatRupiah(budgetPlan.total)} / {formatRupiah(budgetPlan.pool)}</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${budgetPlan.overBudget ? "bg-secondary" : "bg-primary"}`} style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="type-caption mt-2 text-on-surface">
            Estimasi makan & transport {formatRupiah(budgetPlan.total)} untuk {partySize} orang.
            {budgetPlan.overBudget
              ? ` Kelebihan ${formatRupiah(Math.abs(budgetPlan.remaining))}. Ubah budget atau regenerasi untuk rute yang lebih hemat.`
              : ` Sisa ${formatRupiah(Math.max(0, budgetPlan.remaining))}.`}
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
          {days.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 type-caption ${routeFilter === "all" ? "bg-primary text-white" : "bg-slate-100 text-on-surface"}`}
                onClick={() => setRouteFilter("all")}
              >
                Semua rute
              </button>
              {days.map((day) => (
                <button
                  key={`list-${day.id}`}
                  type="button"
                  className={`rounded-full px-3 py-1.5 type-caption ${routeFilter === day.id ? "bg-primary text-white" : "bg-slate-100 text-on-surface"}`}
                  onClick={() => setRouteFilter(day.id)}
                >
                  Hari {day.dayNumber}
                </button>
              ))}
            </div>
          ) : null}
          {visibleDays.map((day) => {
            const dayTotal = day.stops.reduce((sum, stop) => sum + (budgetPlan.byStopId[stop.id]?.total ?? 0), 0);
            return (
            <section key={day.id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="type-micro font-bold text-primary">Hari {day.dayNumber} · {day.date}</p>
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
                  const placeValue = stop.customTitle || stop.place?.name || "";
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
                      <div className={`grid grid-cols-[2rem_2rem_minmax(0,1fr)] items-stretch gap-x-2 bg-white px-1 ${active ? "rounded-xl ring-1 ring-primary/20" : ""}`}>
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
                              style={{ backgroundColor: itineraryStopColor(index) }}
                              aria-hidden="true"
                            />
                          ) : index > 0 ? (
                            <span
                              className="absolute left-1/2 top-0 z-0 h-7 w-[3px] -translate-x-1/2"
                              style={{ backgroundColor: itineraryStopColor(index - 1) }}
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative z-10 mt-3">
                            <ItineraryStopPin
                              index={index}
                              sequence={stop.sequence}
                              selected={active}
                              shape="circle"
                              halo={false}
                            />
                          </div>
                        </div>
                        <div className="min-w-0 bg-white py-3">
                          <div className="flex flex-wrap items-start justify-between gap-1">
                            <div>
                              {meeting ? <p className="mb-0.5 inline-flex rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Titik kumpul</p> : null}
                              <p className="text-sm font-extrabold leading-snug text-on-surface">{placeValue || "Titik rute"}</p>
                            </div>
                            <p className="shrink-0 text-sm font-extrabold text-primary">
                              {cost && cost.ticketCost > 0 ? formatRupiah(cost.ticketCost) : "Gratis masuk"}
                            </p>
                          </div>
                          <p className="type-caption mt-0.5 text-on-surface-variant">
                            Ideal {visitWindowLabel(stop.startTime, stop.durationMinutes) || `${stop.startTime ?? "—"} · ${stop.durationMinutes} menit`}
                            {" · "}{stop.activityType}
                          </p>
                          {cost?.lines.find((line) => line.key === "transport") ? (
                            <p className="type-caption mt-0.5 font-bold text-on-surface">
                              {cost.lines.find((line) => line.key === "transport")!.detail}
                              {cost.travelCost > 0 ? ` · ${formatRupiah(cost.travelCost)}` : ""}
                            </p>
                          ) : null}
                          {cost ? (
                            <div className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                              <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary">Rincian di titik ini</p>
                              {cost.ticketCost === 0 ? (
                                <p className="type-caption font-bold text-on-surface">Masuk gratis, tanpa tiket.</p>
                              ) : null}
                              {cost.lines.map((line) => (
                                <p key={line.key} className="flex items-start justify-between gap-2 type-caption text-on-surface">
                                  <span>
                                    <span className="font-bold">{line.label}</span>
                                    {" · "}
                                    {line.detail}
                                  </span>
                                  <span className="shrink-0 font-extrabold">{formatRupiah(line.amount)}</span>
                                </p>
                              ))}
                              <p className="flex justify-between gap-2 border-t border-slate-200 pt-1 type-caption font-extrabold text-on-surface">
                                <span>Total estimasi (bukan tiket wajib)</span>
                                <span>{formatRupiah(cost.total)}</span>
                              </p>
                            </div>
                          ) : null}
                          {stop.notes ? <p className="type-caption mt-1 line-clamp-2 text-on-surface">{stop.notes}</p> : null}
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
                                Pertahankan saat regenerate
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
                        hint="Pilih dari saran supaya titik muncul di peta."
                        placeholder="Cari atau ketik nama tempat"
                        onChange={setAddQuery}
                        onSelectPlace={(geo) => commitAdd(day.id, {
                          name: geo.label,
                          city: geo.city || destinationCity,
                          latitude: geo.latitude,
                          longitude: geo.longitude,
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
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <Icon name="map" className="text-[20px] text-primary" />
          <div>
            <p className="type-caption font-bold text-on-surface">Peta rute</p>
            <p className="type-caption text-on-surface-variant">Filter hari di bawah. Nomor 1-2-3 berlanjut ke hari berikutnya.</p>
          </div>
        </div>
        {days.length > 1 ? (
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 bg-white px-3 py-2">
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 type-caption ${routeFilter === "all" ? "bg-primary text-white" : "bg-slate-100 text-on-surface"}`}
              onClick={() => setRouteFilter("all")}
            >
              Semua rute
            </button>
            {days.map((day) => (
              <button
                key={day.id}
                type="button"
                className={`rounded-full px-3 py-1.5 type-caption ${routeFilter === day.id ? "bg-primary text-white" : "bg-slate-100 text-on-surface"}`}
                onClick={() => setRouteFilter(day.id)}
              >
                Hari {day.dayNumber}
              </button>
            ))}
          </div>
        ) : null}
        <div className="h-[280px] bg-white md:h-[340px] lg:h-[420px]">
          {markers.length > 0 ? (
            <TripBoardMap markers={markers} onSelect={onSelectStop} routeColor={ITINERARY_ROUTE_COLOR} numberedBadges routeGroups={routeGroups} />
          ) : (
            <div className="grid h-full place-items-center bg-white px-6 text-center">
              <p className="type-caption text-on-surface-variant">
                {generating ? "AI sedang menyusun rute dan estimasi biaya…" : "Rute belum punya koordinat. Generate atau pilih template dulu."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

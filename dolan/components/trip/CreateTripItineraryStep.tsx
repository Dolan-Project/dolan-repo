"use client";

import { useState } from "react";
import type { EditableItineraryDay, EditableItineraryStop } from "@dolan/shared";
import { TripBoardMap } from "@/components/trip/TripBoardMap";
import { Icon } from "@/components/ui/Icon";
import {
  canRegenerate,
  formatRupiah,
  itineraryMapMarkers,
  itineraryMapRouteGroups,
  remainingRegenerates,
  visitWindowLabel,
  type ItineraryBudgetPlan,
} from "@/lib/template-itinerary";
import { ItineraryStopPin } from "@/components/trip/ItineraryTimeline";

type CreateTripItineraryStepProps = {
  days: EditableItineraryDay[];
  selectedStopId: string | null;
  editingStopId: string | null;
  generating: boolean;
  fromTemplate: boolean;
  regenerateUsed: number;
  budgetPlan: ItineraryBudgetPlan;
  partySize: number;
  isPublic: boolean;
  onSelectStop: (id: string) => void;
  onEditStop: (id: string) => void;
  onCloseEdit: () => void;
  onReorderStops: (dayId: string, fromIndex: number, toIndex: number) => void;
  onUpdateStop: (dayId: string, stopId: string, patch: Partial<EditableItineraryStop>) => void;
  onRegenerate: () => void;
};

export function CreateTripItineraryStep({
  days,
  selectedStopId,
  editingStopId,
  generating,
  fromTemplate,
  regenerateUsed,
  budgetPlan,
  partySize,
  isPublic,
  onSelectStop,
  onEditStop,
  onCloseEdit,
  onReorderStops,
  onUpdateStop,
  onRegenerate,
}: CreateTripItineraryStepProps) {
  const [drag, setDrag] = useState<{ dayId: string; index: number } | null>(null);
  const markers = itineraryMapMarkers(days, selectedStopId ?? editingStopId);
  const routeGroups = itineraryMapRouteGroups(days);
  const leftover = remainingRegenerates(regenerateUsed);
  const editing = days.flatMap((day) => day.stops.map((stop) => ({ day, stop }))).find((item) => item.stop.id === editingStopId);
  const usedPercent = budgetPlan.pool > 0 ? Math.min(100, Math.round((budgetPlan.total / budgetPlan.pool) * 100)) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.78fr)] lg:items-start">
      <div className="card-surface flex flex-col p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="type-micro font-extrabold uppercase tracking-[0.16em] text-primary">Rute, biaya & penjelasan</p>
            <h2 className="mt-1 text-lg font-extrabold text-on-surface">
              {fromTemplate ? "Itinerary dari template" : "Itinerary + estimasi AI"}
            </h2>
            <p className="type-caption mt-1 text-on-surface-variant">
              AI menyusun koridor terdekat, jam kunjungan, dan estimasi tiket/makan/transport. Regenerate mencari tempat lain yang lebih hemat jarak atau budget.
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost !min-h-9 !px-3 !text-xs"
            disabled={generating || !canRegenerate(regenerateUsed)}
            onClick={onRegenerate}
          >
            {generating ? "Mengoptimalkan…" : leftover > 0 ? `Regenerate (${leftover}x)` : "Batas regenerate"}
          </button>
        </div>
        <div className={`mb-3 rounded-xl px-3 py-2.5 ${budgetPlan.overBudget ? "bg-orange-50" : "bg-primary-fixed/50"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`type-caption font-bold ${budgetPlan.overBudget ? "text-secondary" : "text-primary"}`}>
              {budgetPlan.overBudget ? "Estimasi melebihi budget" : `Budget terpakai ${usedPercent}%`}
            </p>
            <p className="type-caption font-bold text-on-surface">{formatRupiah(budgetPlan.total)} / {formatRupiah(budgetPlan.pool)}</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div className={`h-full rounded-full ${budgetPlan.overBudget ? "bg-secondary" : "bg-primary"}`} style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="type-caption mt-2 text-on-surface">
            Estimasi itinerary {formatRupiah(budgetPlan.total)} untuk {partySize} orang.
            {budgetPlan.overBudget
              ? ` Kelebihan ${formatRupiah(Math.abs(budgetPlan.remaining))}. Regenerate untuk rute/tempat yang lebih hemat.`
              : ` Sisa ${formatRupiah(Math.max(0, budgetPlan.remaining))}.`}
          </p>
        </div>
        <div className="space-y-3">
          {days.map((day) => {
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
                  const colorIndex = Math.max(0, days.flatMap((item) => item.stops).findIndex((item) => item.id === stop.id));
                  const last = index === day.stops.length - 1;
                  return (
                    <li
                      key={stop.id}
                      className="relative"
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
                          {index > 0 ? (
                            <span className="absolute left-1/2 top-0 h-7 w-[3px] -translate-x-1/2 bg-[#004ac6]" aria-hidden="true" />
                          ) : null}
                          {last ? null : (
                            <span className="absolute left-1/2 top-7 bottom-0 w-[3px] -translate-x-1/2 bg-[#004ac6]" aria-hidden="true" />
                          )}
                          <div className="relative z-10 mt-3">
                            <ItineraryStopPin index={colorIndex} sequence={stop.sequence} selected={active} shape="circle" />
                          </div>
                        </div>
                        <div className="min-w-0 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-1">
                            <div>
                              {meeting ? <p className="mb-0.5 inline-flex rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Titik kumpul</p> : null}
                              <p className="text-sm font-extrabold leading-snug text-on-surface">{stop.customTitle || stop.place?.name || "Titik rute"}</p>
                            </div>
                            <p className="text-sm font-extrabold text-primary">{cost ? formatRupiah(cost.total) : "—"}</p>
                          </div>
                          <p className="type-caption mt-0.5 text-on-surface-variant">
                            Ideal {visitWindowLabel(stop.startTime, stop.durationMinutes) || `${stop.startTime ?? "—"} · ${stop.durationMinutes} menit`}
                            {" · "}{stop.activityType}
                            {stop.travelDurationMinutes ? ` · tempuh ${stop.travelDurationMinutes} menit` : ""}
                          </p>
                          {cost ? (
                            <div className="mt-2 space-y-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                              <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary">Uang terpakai di titik ini</p>
                              {cost.ticketCost === 0 ? (
                                <p className="type-caption font-bold text-on-surface-variant">Masuk gratis, tanpa tiket.</p>
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
                              <p className="flex justify-between gap-2 border-t border-outline-variant/40 pt-1 type-caption font-extrabold text-on-surface">
                                <span>Total titik</span>
                                <span>{formatRupiah(cost.total)}</span>
                              </p>
                            </div>
                          ) : null}
                          {stop.notes ? <p className="type-caption mt-1 line-clamp-2 text-on-surface">{stop.notes}</p> : null}
                          <div className="mt-1.5">
                            <button type="button" className="btn-ghost !min-h-8 !px-2.5 !text-xs" onClick={() => onEditStop(stop.id)}>
                              <Icon name="edit" className="text-[16px]" />
                              Edit
                            </button>
                          </div>
                          {editingStopId === stop.id && editing ? (
                            <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="type-caption font-bold text-primary">Edit itinerary</p>
                                <button type="button" className="btn-ghost !min-h-8 !px-2 !text-xs" onClick={onCloseEdit}>Tutup</button>
                              </div>
                              <label className="block">
                                <span className="type-caption text-on-surface-variant">Nama tempat</span>
                                <input
                                  className="field-input mt-1 min-h-10 text-sm"
                                  value={editing.stop.customTitle || editing.stop.place?.name || ""}
                                  onChange={(event) => onUpdateStop(editing.day.id, editing.stop.id, { customTitle: event.target.value })}
                                />
                              </label>
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
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
            );
          })}
        </div>
      </div>
      <div className="card-surface overflow-hidden lg:sticky lg:top-24">
        <div className="flex items-center gap-2 border-b border-outline-variant/40 px-4 py-3">
          <Icon name="map" className="text-[20px] text-primary" />
          <div>
            <p className="type-caption font-bold text-on-surface">Peta rute</p>
            <p className="type-caption text-on-surface-variant">Klik angka di peta untuk edit. Garis biru mengikuti jalan, terpisah per hari.</p>
          </div>
        </div>
        <div className="h-[280px] md:h-[340px] lg:h-[420px]">
          {markers.length > 0 ? (
            <TripBoardMap markers={markers} onSelect={onSelectStop} routeColor="#004ac6" numberedBadges routeGroups={routeGroups} />
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

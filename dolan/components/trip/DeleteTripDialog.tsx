"use client";

import { useState } from "react";
import { TRIP_DELETE_REASON_TEMPLATES } from "@/lib/contracts";

const CUSTOM = "custom";

export function DeleteTripDialog({
  tripTitle,
  pending = false,
  onCancel,
  onConfirm,
}: {
  tripTitle: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [template, setTemplate] = useState<string>(TRIP_DELETE_REASON_TEMPLATES[0]);
  const [customReason, setCustomReason] = useState("");
  const reason = template === CUSTOM ? customReason : template;
  const valid = reason.trim().length >= 3;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-trip-title"
      onClick={onCancel}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <p className="type-micro font-extrabold uppercase tracking-[0.16em] text-error">Hapus trip</p>
        <h2 id="delete-trip-title" className="mt-1 text-lg font-extrabold text-on-surface">Hapus “{tripTitle}”?</h2>
        <p className="type-body mt-3 text-on-surface-variant">
          Trip dan grup chat akan dihapus. Peserta menerima notifikasi beserta pesan dari kamu.
        </p>
        <label className="mt-4 block">
          <span className="type-caption text-on-surface-variant">Alasan</span>
          <select
            aria-label="Pilih alasan menghapus trip"
            className="field-input mt-1 min-h-11 text-sm"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
          >
            {TRIP_DELETE_REASON_TEMPLATES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
            <option value={CUSTOM}>Tulis alasan sendiri</option>
          </select>
        </label>
        {template === CUSTOM ? (
          <label className="mt-3 block">
            <span className="type-caption text-on-surface-variant">Alasan kamu</span>
            <textarea
              className="field-input mt-1 min-h-24 text-sm"
              value={customReason}
              maxLength={280}
              placeholder="Contoh: Jadwal bentrok, jadi grup ini ditutup."
              onChange={(event) => setCustomReason(event.target.value)}
            />
          </label>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" disabled={pending} onClick={onCancel}>Tidak</button>
          <button
            type="button"
            className="rounded-full bg-error px-4 py-3 type-label text-white disabled:opacity-50"
            disabled={pending || !valid}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending ? "Menghapus…" : "Ya, hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

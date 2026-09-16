"use client";

import { overBudgetSaveMessage } from "@/lib/template-itinerary";

export function OverBudgetConfirmDialog({
  estimate,
  available,
  pending = false,
  onCancel,
  onContinue,
}: {
  estimate: number;
  available: number;
  pending?: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="over-budget-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <p className="type-micro font-extrabold uppercase tracking-[0.16em] text-secondary">Budget belum cukup</p>
        <h2 id="over-budget-title" className="mt-1 text-lg font-extrabold text-on-surface">Estimasi melebihi budget tersedia</h2>
        <p className="type-body mt-3 text-on-surface-variant">{overBudgetSaveMessage(estimate, available)}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" disabled={pending} onClick={onCancel}>Tidak</button>
          <button type="button" className="btn-primary" disabled={pending} onClick={onContinue}>
            {pending ? "Menyimpan…" : "Tetap lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

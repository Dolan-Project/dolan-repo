"use client";

import { useState } from "react";

type ReportTargetType = "user" | "trip" | "comment" | "message" | "review";

export function ReportTargetButton({
  targetType,
  targetId,
  label = "Laporkan",
}: {
  targetType: ReportTargetType;
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/v1/reports", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetType,
        targetId,
        reason: reason.trim() || `laporan ${targetType}`,
      }),
    });
    const json = (await response.json()) as { success: boolean; error?: { message: string } };
    setPending(false);
    if (!json.success) {
      setMessage(json.error?.message ?? "Laporan gagal");
      return;
    }
    setReason("");
    setOpen(false);
    setMessage("Laporan terkirim ke moderasi.");
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button type="button" className="btn-ghost !min-h-11" onClick={() => setOpen((v) => !v)}>
        {label}
      </button>
      {open ? (
        <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-3">
          <textarea
            className="min-h-16 w-full rounded-lg border border-outline-variant p-2 type-body"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan singkat"
          />
          <button type="button" className="btn-primary mt-2 !min-h-11" disabled={pending} onClick={() => void submit()}>
            {pending ? "Mengirim…" : "Kirim laporan"}
          </button>
        </div>
      ) : null}
      {message ? <p className="type-caption text-on-surface-variant">{message}</p> : null}
    </div>
  );
}

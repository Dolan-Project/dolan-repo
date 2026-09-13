"use client";

import { useState } from "react";

type BlockReportActionsProps = {
  username: string;
  targetUserId: string;
};

export function BlockReportActions({ username, targetUserId }: BlockReportActionsProps) {
  const [blocked, setBlocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function toggleBlock() {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/v1/users/${username}/block`, {
      method: blocked ? "DELETE" : "POST",
      credentials: "include",
    });
    const json = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };
    setPending(false);
    if (!json.success) {
      setMessage(json.error?.message ?? "Tidak bisa memblokir");
      return;
    }
    setBlocked((value) => !value);
  }

  async function submitReport() {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/v1/reports", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetType: "user",
        targetId: targetUserId,
        reason: reason.trim() || "laporan pengguna",
      }),
    });
    const json = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };
    setPending(false);
    if (!json.success) {
      setMessage(json.error?.message ?? "Laporan gagal dikirim");
      return;
    }
    setReason("");
    setMessage("Laporan terkirim ke moderasi.");
  }

  return (
    <div className="flex min-w-[12rem] flex-col gap-2">
      <button
        type="button"
        className="btn-ghost !min-h-11"
        disabled={pending}
        onClick={() => void toggleBlock()}
      >
        {blocked ? "Buka blokir" : "Blokir"}
      </button>
      <label className="type-caption font-semibold text-on-surface">
        Laporkan pengguna
        <textarea
          className="mt-1 min-h-16 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5 type-body text-on-surface"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Alasan singkat"
        />
      </label>
      <button
        type="button"
        className="btn-secondary !min-h-11"
        disabled={pending}
        onClick={() => void submitReport()}
      >
        Kirim laporan
      </button>
      {message ? <p className="type-caption text-on-surface-variant">{message}</p> : null}
    </div>
  );
}

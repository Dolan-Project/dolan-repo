"use client";

import { useEffect, useState } from "react";

type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
};

export function AdminReportsPanel() {
  const [items, setItems] = useState<ReportRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/v1/admin/reports", { credentials: "include" });
    const json = (await response.json()) as {
      success: boolean;
      data?: { items: ReportRow[] };
      error?: { message: string };
    };
    if (!json.success) {
      setMessage(json.error?.message ?? "Tidak bisa memuat laporan");
      setItems([]);
      return;
    }
    setMessage(null);
    setItems(json.data?.items ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function moderate(id: string, action: "hide" | "dismiss") {
    const response = await fetch(`/api/v1/admin/reports/${id}/moderate`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = (await response.json()) as { success: boolean; error?: { message: string } };
    if (!json.success) {
      setMessage(json.error?.message ?? "Moderasi gagal");
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-[800px] px-margin py-6 md:px-margin-desktop md:py-8">
      <h1 className="type-title text-on-surface">Laporan komunitas</h1>
      <p className="type-body mt-2 text-on-surface-variant">
        Aksi minimum: sembunyikan konten atau tolak laporan. Sesi mock admin memakai cookie
        {" "}
        <code className="rounded bg-surface-container px-1">dolan_session=admin</code>.
      </p>
      {message ? <p className="type-body mt-3 text-error">{message}</p> : null}
      <ul className="mt-5 grid gap-3">
        {items.map((row) => (
          <li key={row.id} className="card-surface p-4">
            <p className="type-label font-extrabold text-on-surface">
              {row.targetType} · {row.targetId}
            </p>
            <p className="type-body mt-1 text-on-surface-variant">{row.reason}</p>
            <p className="type-caption mt-1 text-on-surface-variant">Status: {row.status}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary !min-h-11"
                onClick={() => void moderate(row.id, "hide")}
              >
                Sembunyikan
              </button>
              <button
                type="button"
                className="btn-ghost !min-h-11"
                onClick={() => void moderate(row.id, "dismiss")}
              >
                Tolak laporan
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

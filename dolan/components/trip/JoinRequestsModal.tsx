"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { JoinRequest } from "@/lib/contracts";
import { ROUTES } from "@/lib/routes";

type JoinRequestsModalProps = {
  tripId: string;
  tripTitle: string;
  onClose?: () => void;
  onChanged?: () => void;
  variant?: "modal" | "panel";
};

export function JoinRequestsModal({ tripId, tripTitle, onClose, onChanged, variant = "modal" }: JoinRequestsModalProps) {
  const [rows, setRows] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/join-requests`, { credentials: "include" });
      const json = (await response.json()) as { success?: boolean; data?: JoinRequest[] | { items?: JoinRequest[] }; error?: { message?: string } };
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Gagal memuat permintaan gabung.");
      const list = Array.isArray(json.data) ? json.data : json.data?.items ?? [];
      setRows(list);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memuat permintaan gabung.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [tripId]);

  async function review(requestId: string, decision: "accept" | "reject") {
    setPending(requestId);
    setError("");
    try {
      const response = await fetch(`/api/v1/join-requests/${encodeURIComponent(requestId)}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = (await response.json()) as { success?: boolean; error?: { message?: string } };
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Gagal memproses permintaan.");
      await load();
      onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal memproses permintaan.");
    } finally {
      setPending("");
    }
  }

  const body = (
      <div className={variant === "panel" ? "w-full" : "w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="type-micro font-extrabold uppercase tracking-[0.16em] text-primary">Permintaan gabung</p>
            <h2 id="join-requests-title" className="mt-1 text-lg font-extrabold text-on-surface">{tripTitle}</h2>
          </div>
          {onClose ? (
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100" onClick={onClose} aria-label="Tutup">
              <Icon name="close" />
            </button>
          ) : null}
        </div>
        {loading ? <p className="mt-4 type-body text-on-surface-variant">Memuat…</p> : null}
        {error ? <p className="mt-3 type-caption text-error" role="alert">{error}</p> : null}
        {!loading && rows.length === 0 ? <p className="mt-4 type-body text-on-surface-variant">Belum ada permintaan gabung.</p> : null}
        <ul className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
              <Link href={ROUTES.profilUser(row.applicant.username)} className="shrink-0" aria-label={`Profil @${row.applicant.username}`}>
                <UserAvatar src={row.applicant.avatarUrl} alt={row.applicant.displayName} className="h-12 w-12 rounded-full" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={ROUTES.profilUser(row.applicant.username)} className="type-label font-bold text-on-surface hover:text-primary">
                  {row.applicant.displayName}
                </Link>
                <p className="type-caption text-on-surface-variant">@{row.applicant.username}</p>
                <p className="mt-1 type-caption text-on-surface">{row.message || "Tanpa pesan"}</p>
                {row.status === "PENDING" ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="btn-primary !min-h-9 !px-3 !text-xs" disabled={Boolean(pending)} onClick={() => void review(row.id, "accept")}>
                      {pending === row.id ? "Memproses…" : "Terima"}
                    </button>
                    <button type="button" className="btn-ghost !min-h-9 !px-3 !text-xs" disabled={Boolean(pending)} onClick={() => void review(row.id, "reject")}>
                      Tolak
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 type-micro uppercase text-on-surface-variant">{row.status}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
  );

  if (variant === "panel") return body;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="join-requests-title">
      {body}
    </div>
  );
}

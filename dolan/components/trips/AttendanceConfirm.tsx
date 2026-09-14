"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type AttendanceConfirmProps = {
  tripId: string;
  tripTitle?: string;
  reviewUsername?: string | null;
  /** When host, can mark a participant's attendance. */
  isHost?: boolean;
  participantUserId?: string | null;
  participantLabel?: string | null;
};

export function AttendanceConfirm({
  tripId,
  tripTitle,
  reviewUsername = null,
  isHost = false,
  participantUserId = null,
  participantLabel = null,
}: AttendanceConfirmProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [disputed, setDisputed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [markPresent, setMarkPresent] = useState(true);

  async function submit(body: { confirmed: boolean; targetUserId?: string }) {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/attendance`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as {
      success: boolean;
      data?: { confirmed: boolean; disputed?: boolean };
      error?: { message: string };
    };
    setPending(false);
    if (!json.success) {
      setMessage(json.error?.message ?? "Konfirmasi gagal");
      return;
    }
    setConfirmed(Boolean(json.data?.confirmed));
    setDisputed(Boolean(json.data?.disputed));
    setMessage(
      json.data?.disputed
        ? "Kehadiran disputed — host dan peserta tidak selaras. Review ditunda sampai diselesaikan."
        : "Kehadiran pada trip selesai sudah dicatat.",
    );
  }

  const reviewHref =
    reviewUsername != null && reviewUsername.length > 0
      ? `${ROUTES.profilUlasan(reviewUsername)}?tripId=${encodeURIComponent(tripId)}`
      : null;

  return (
    <section className="card-surface mt-3 p-4 md:p-5">
      <h2 className="type-subtitle text-on-surface">Konfirmasi kehadiran</h2>
      <p className="type-body mt-1 text-on-surface-variant">
        {tripTitle ? `${tripTitle}. ` : ""}
        Setelah trip selesai, host menandai kehadiran peserta dan peserta mengonfirmasi sendiri. Review
        terbuka 30 hari setelah trip selesai, hanya jika keduanya Present (bukan disputed).
      </p>
      <button
        type="button"
        className="btn-primary mt-3 !min-h-11"
        disabled={pending || confirmed}
        onClick={() => void submit({ confirmed: true })}
      >
        {confirmed ? "Sudah konfirmasi diri" : pending ? "Memproses…" : "Konfirmasi kehadiran saya"}
      </button>
      {isHost && participantUserId ? (
        <div className="mt-4 space-y-2 border-t border-outline-variant/40 pt-3">
          <p className="type-label text-on-surface">
            Tandai kehadiran {participantLabel ?? "peserta"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn-ghost !min-h-11 ${markPresent ? "ring-2 ring-primary" : ""}`}
              onClick={() => setMarkPresent(true)}
            >
              Hadir
            </button>
            <button
              type="button"
              className={`btn-ghost !min-h-11 ${!markPresent ? "ring-2 ring-primary" : ""}`}
              onClick={() => setMarkPresent(false)}
            >
              Tidak hadir
            </button>
            <button
              type="button"
              className="btn-primary !min-h-11"
              disabled={pending}
              onClick={() =>
                void submit({ confirmed: markPresent, targetUserId: participantUserId })
              }
            >
              Simpan tanda host
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p className={`type-caption mt-2 ${disputed ? "text-error" : "text-on-surface-variant"}`}>
          {message}
        </p>
      ) : null}
      {reviewHref && confirmed && !disputed ? (
        <Link
          href={reviewHref}
          className="mt-3 inline-flex min-h-11 items-center type-label font-semibold text-primary"
        >
          Tulis ulasan untuk @{reviewUsername}
        </Link>
      ) : null}
    </section>
  );
}

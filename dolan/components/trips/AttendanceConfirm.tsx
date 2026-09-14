"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type AttendanceConfirmProps = {
  tripId: string;
  tripTitle?: string;
  reviewUsername?: string | null;
};

export function AttendanceConfirm({
  tripId,
  tripTitle,
  reviewUsername = null,
}: AttendanceConfirmProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/attendance`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmed: true }),
    });
    const json = (await response.json()) as {
      success: boolean;
      data?: { confirmed: boolean };
      error?: { message: string };
    };
    setPending(false);
    if (!json.success) {
      setMessage(json.error?.message ?? "Konfirmasi gagal");
      return;
    }
    setConfirmed(true);
    setMessage("Kehadiran pada trip selesai sudah dikonfirmasi.");
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
        Setelah trip selesai, host dan peserta sama-sama konfirmasi kehadiran. Review rekan baru terbuka
        setelah keduanya konfirmasi.
      </p>
      <button
        type="button"
        className="btn-primary mt-3 !min-h-11"
        disabled={pending || confirmed}
        onClick={() => void onConfirm()}
      >
        {confirmed ? "Sudah konfirmasi" : pending ? "Memproses…" : "Konfirmasi kehadiran trip selesai"}
      </button>
      {message ? <p className="type-caption mt-2 text-on-surface-variant">{message}</p> : null}
      {reviewHref ? (
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type AttendanceConfirmProps = {
  tripId?: string;
};

export function AttendanceConfirm({ tripId = "trip_completed" }: AttendanceConfirmProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/v1/trips/${tripId}/attendance`, {
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

  return (
    <section className="card-surface mt-6 p-4 md:p-5">
      <h2 className="type-subtitle text-on-surface">Konfirmasi kehadiran</h2>
      <p className="type-body mt-1 text-on-surface-variant">
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
      <Link
                href={ROUTES.profilUlasan("wayan")}
                className="mt-3 inline-flex min-h-11 items-center type-label font-semibold text-primary"
              >
                Tulis ulasan untuk @wayan
              </Link>
    </section>
  );
}

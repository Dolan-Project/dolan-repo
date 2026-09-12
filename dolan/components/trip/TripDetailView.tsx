"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ApiError, TripDetail } from "@/lib/contracts";
import { ROUTES, tripEditHref } from "@/lib/routes";

export function TripDetailView({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  async function reload() {
    const response = await fetch(`/api/v1/trips/${tripId}`, {
      credentials: "include",
    });
    const json = (await response.json()) as
      | { success: true; data: TripDetail }
      | ApiError;
    if (!json.success) {
      setError(json.error.message);
      setTrip(null);
      return;
    }
    setError("");
    setTrip(json.data);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function act(path: string, body: unknown) {
    setPending(true);
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { success: boolean; error?: { message: string } };
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Aksi gagal");
      return;
    }
    if (path.endsWith("/leave")) {
      router.push(ROUTES.tripSaya);
      router.refresh();
      return;
    }
    await reload();
  }

  if (!trip && !error) {
    return (
      <p className="px-margin py-10 type-body text-on-surface-variant">Memuat trip…</p>
    );
  }
  if (!trip) {
    return (
      <p className="px-margin py-10 type-body text-error" role="alert">
        {error}
      </p>
    );
  }

  const perPerson =
    trip.budgetBasis === "PER_PERSON"
      ? trip.budgetAmount
      : Math.round(trip.budgetAmount / Math.max(trip.planningPartySize, 1));

  return (
    <div className="mx-auto max-w-3xl px-margin py-8 md:px-margin-desktop">
      <p className="type-micro uppercase text-primary">{trip.viewerRole}</p>
      <h1 className="type-title mt-1 text-on-surface">{trip.title}</h1>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="chip bg-surface-container-high text-primary">{trip.status}</span>
        <span className="chip bg-surface-container text-on-surface-variant">
          {trip.visibility}
        </span>
        {trip.visibility === "PUBLIC" ? (
          <span className="chip bg-secondary-fixed text-on-secondary-container">
            Join gratis
          </span>
        ) : null}
      </div>
      <p className="type-body mt-3 text-on-surface-variant">
        {trip.origin} → {trip.destinationCity || "Tujuan belum dipilih"} · {trip.startDate}{" "}
        – {trip.endDate}
      </p>
      {trip.meetingPoint ? (
        <p className="type-caption mt-1 text-on-surface-variant">
          Titik temu: {trip.meetingPoint}
        </p>
      ) : null}
      <p className="type-body mt-3 text-on-surface">{trip.description}</p>
      <p className="type-caption mt-3 text-on-surface-variant">
        Estimasi ± Rp {perPerson.toLocaleString("id-ID")} / orang (alat bantu, bukan tarif
        join). Rencana {trip.planningPartySize} orang
        {trip.maxParticipants ? ` · kapasitas ${trip.maxParticipants}` : ""}.
      </p>
      {error ? (
        <p className="type-body mt-3 text-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {trip.viewerRole === "host" &&
        trip.status !== "CANCELLED" &&
        trip.status !== "COMPLETED" ? (
          <Link href={tripEditHref(trip.id)} className="btn-ghost">
            Edit trip
          </Link>
        ) : null}
        {trip.viewerRole === "host" && trip.status === "DRAFT" ? (
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              void act(`/api/v1/trips/${trip.id}/publish`, {
                confirmPublish: true,
                visibility: trip.visibility,
              })
            }
          >
            Publish
          </button>
        ) : null}
        {trip.viewerRole === "host" && trip.status === "OPEN" ? (
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={() =>
              void act(`/api/v1/trips/${trip.id}/transition`, { action: "close" })
            }
          >
            Tutup pengajuan
          </button>
        ) : null}
        {trip.viewerRole === "host" && trip.status === "CLOSED" ? (
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              void act(`/api/v1/trips/${trip.id}/transition`, { action: "reopen" })
            }
          >
            Buka lagi
          </button>
        ) : null}
        {trip.viewerRole === "host" &&
        (trip.status === "OPEN" || trip.status === "CLOSED") ? (
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={() =>
              void act(`/api/v1/trips/${trip.id}/transition`, { action: "start" })
            }
          >
            Mulai trip
          </button>
        ) : null}
        {trip.viewerRole === "host" && trip.status === "ONGOING" ? (
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              void act(`/api/v1/trips/${trip.id}/transition`, {
                action: "complete",
              })
            }
          >
            Selesai
          </button>
        ) : null}
        {trip.viewerRole === "host" &&
        trip.status !== "CANCELLED" &&
        trip.status !== "COMPLETED" ? (
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={() =>
              void act(`/api/v1/trips/${trip.id}/transition`, { action: "cancel" })
            }
          >
            Batalkan
          </button>
        ) : null}
        {trip.viewerRole === "participant" && trip.status !== "ONGOING" ? (
          <button
            type="button"
            className="btn-ghost"
            disabled={pending}
            onClick={() => void act(`/api/v1/trips/${trip.id}/leave`, {})}
          >
            Keluar trip
          </button>
        ) : null}
        {trip.viewerRole === "participant" && trip.status === "ONGOING" ? (
          confirmLeave ? (
            <div className="flex w-full flex-col gap-2 rounded-xl bg-error-container p-4 md:w-auto">
              <p className="type-caption text-on-error-container">
                Trip sedang berlangsung. Konfirmasi dulu sebelum keluar.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={pending}
                  onClick={() =>
                    void act(`/api/v1/trips/${trip.id}/leave`, {
                      confirmLeave: true,
                    })
                  }
                >
                  Ya, keluar
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setConfirmLeave(false)}
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              disabled={pending}
              onClick={() => setConfirmLeave(true)}
            >
              Keluar trip
            </button>
          )
        ) : null}
        {trip.viewerRole === "pending" ? (
          <p className="type-caption text-on-surface-variant">
            Status pengajuan: pending. Kamu belum peserta, jadi belum bisa chat atau
            keluar sebagai anggota.
          </p>
        ) : null}
      </div>
      <Link href={ROUTES.tripSaya} className="type-label mt-8 inline-block text-primary">
        Kembali ke Trip Saya
      </Link>
    </div>
  );
}

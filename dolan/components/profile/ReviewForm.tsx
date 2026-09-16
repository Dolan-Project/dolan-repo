"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  reviewTripForPeer,
  tripsFromMinePayload,
  type TripForFeedback,
} from "@/lib/community/completed-feedback";
import { ROUTES } from "@/lib/routes";
import { readApiJson } from "@/lib/auth/read-api-json";

type ReviewFormProps = {
  username: string;
  tripId?: string | null;
};

async function loadCompletedMine(): Promise<TripForFeedback[]> {
  const [hosted, joined] = await Promise.all([
    fetch("/api/v1/trips/me?role=hosted", { credentials: "include" }),
    fetch("/api/v1/trips/me?role=joined", { credentials: "include" }),
  ]);
  const [hostedJson, joinedJson] = await Promise.all([
    readApiJson(hosted).catch(() => null),
    readApiJson(joined).catch(() => null),
  ]);
  return [...tripsFromMinePayload(hostedJson), ...tripsFromMinePayload(joinedJson)];
}

export function ReviewForm({ username, tripId: preferredTripId = null }: ReviewFormProps) {
  const [communication, setCommunication] = useState(5);
  const [attitude, setAttitude] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripForFeedback | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [items, setItems] = useState<
    Array<{ id: string; communication: number; attitude: number; comment: string | null }>
  >([]);

  async function loadReviews() {
    const response = await fetch(`/api/v1/users/${encodeURIComponent(username)}/reviews`, {
      credentials: "include",
    });
    const json = (await response.json()) as {
      success: boolean;
      data?: {
        items: Array<{ id: string; communication: number; attitude: number; comment: string | null }>;
      };
    };
    if (json.success) setItems(json.data?.items ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingTrip(true);
      const mine = await loadCompletedMine();
      if (cancelled) return;
      setTrip(reviewTripForPeer(mine, username, preferredTripId));
      setLoadingTrip(false);
    }
    void load();
    void loadReviews();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, preferredTripId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!trip) {
      setMessage("Belum ada trip selesai bersama pengguna ini.");
      return;
    }
    const response = await fetch(`/api/v1/users/${encodeURIComponent(username)}/reviews`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tripId: trip.id,
        communication,
        attitude,
        comment: comment.trim() || null,
      }),
    });
    const json = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };
    if (!json.success) {
      setMessage(json.error?.message ?? "Ulasan gagal dikirim");
      return;
    }
    setMessage("Ulasan tersimpan.");
    await loadReviews();
  }

  return (
    <div className="mx-auto max-w-[720px] px-margin py-6 md:px-margin-desktop md:py-8">
      <Link href={ROUTES.profilUser(username)} className="type-caption font-semibold text-primary">
        ← Kembali ke profil @{username}
      </Link>
      <h1 className="type-title mt-3 text-on-surface">Ulasan @{username}</h1>
      <p className="type-body mt-2 text-on-surface-variant">
        Review hanya untuk peserta trip selesai setelah kedua pihak konfirmasi kehadiran. Tidak bisa mereview
        diri sendiri atau mengirim duplikat. Komentar opsional.
      </p>
      {loadingTrip ? (
        <p className="type-body mt-4 text-on-surface-variant">Mencari trip selesai bersama @{username}…</p>
      ) : trip ? (
        <p className="type-caption mt-3 text-on-surface-variant">
          Terikat trip selesai: {trip.title}
        </p>
      ) : (
        <p className="type-body mt-4 text-on-surface-variant" role="status">
          Belum ada trip selesai bersama @{username}. Konfirmasi kehadiran dulu di Trip Saya atau detail trip
          yang sudah COMPLETED.
        </p>
      )}
      <form onSubmit={(event) => void onSubmit(event)} className="card-surface mt-5 grid gap-3 p-4">
        <label className="type-label text-on-surface">
          Komunikasi ({communication})
          <input
            className="mt-2 w-full"
            type="range"
            min={1}
            max={5}
            value={communication}
            onChange={(event) => setCommunication(Number(event.target.value))}
          />
        </label>
        <label className="type-label text-on-surface">
          Sikap ({attitude})
          <input
            className="mt-2 w-full"
            type="range"
            min={1}
            max={5}
            value={attitude}
            onChange={(event) => setAttitude(Number(event.target.value))}
          />
        </label>
        <label className="type-label text-on-surface">
          Komentar (opsional)
          <textarea
            className="mt-2 min-h-20 w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3 type-body"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Ceritakan komunikasi dan sikap di trip ini"
          />
        </label>
        <button type="submit" className="btn-primary !min-h-11" disabled={!trip}>
          Kirim ulasan trip selesai
        </button>
        {message ? <p className="type-body text-on-surface-variant">{message}</p> : null}
      </form>
      <ul className="mt-5 grid gap-2">
        {items.map((row) => (
          <li key={row.id} className="card-surface px-4 py-3 type-body text-on-surface">
            Komunikasi {row.communication} · Sikap {row.attitude}
            {row.comment ? ` · ${row.comment}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

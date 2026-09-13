"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ROUTES } from "@/lib/routes";

type ReviewFormProps = {
  username: string;
};

export function ReviewForm({ username }: ReviewFormProps) {
  const [communication, setCommunication] = useState(5);
  const [attitude, setAttitude] = useState(5);
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{ id: string; communication: number; attitude: number }>>([]);

  async function load() {
    const response = await fetch(`/api/v1/users/${username}/reviews`, { credentials: "include" });
    const json = (await response.json()) as {
      success: boolean;
      data?: { items: Array<{ id: string; communication: number; attitude: number }> };
    };
    if (json.success) setItems(json.data?.items ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch(`/api/v1/users/${username}/reviews`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tripId: "trip_completed",
        communication,
        attitude,
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
    await load();
  }

  return (
    <div className="mx-auto max-w-[720px] px-margin py-6 md:px-margin-desktop md:py-8">
      <Link href={ROUTES.profilUser(username)} className="type-caption font-semibold text-primary">
        ← Kembali ke profil @{username}
      </Link>
      <h1 className="type-title mt-3 text-on-surface">Ulasan @{username}</h1>
      <p className="type-body mt-2 text-on-surface-variant">
        Review hanya untuk peserta trip yang sudah selesai. Tidak bisa mereview diri sendiri atau mengirim duplikat.
      </p>
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
        <button type="submit" className="btn-primary !min-h-11">
          Kirim ulasan trip selesai
        </button>
        {message ? <p className="type-body text-on-surface-variant">{message}</p> : null}
      </form>
      <ul className="mt-5 grid gap-2">
        {items.map((row) => (
          <li key={row.id} className="card-surface px-4 py-3 type-body text-on-surface">
            Komunikasi {row.communication} · Sikap {row.attitude}
          </li>
        ))}
      </ul>
    </div>
  );
}

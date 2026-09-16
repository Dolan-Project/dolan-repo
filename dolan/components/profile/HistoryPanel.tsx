"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";

type HistoryPanelProps = {
  username: string;
};

export function HistoryPanel({ username }: HistoryPanelProps) {
  const [items, setItems] = useState<Array<{ title: string; visibility: string }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/v1/users/${username}/history`, { credentials: "include" });
      const json = (await response.json()) as {
        success: boolean;
        data?: { items: Array<{ title: string; visibility: string }> };
      };
      if (!cancelled && json.success) setItems(json.data?.items ?? []);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  return (
    <div className="mx-auto max-w-[720px] px-margin py-6 md:px-margin-desktop md:py-8">
      <Link href={ROUTES.profilUser(username)} className="type-caption font-semibold text-primary">
        ← Kembali ke profil @{username}
      </Link>
      <h1 className="type-title mt-3 text-on-surface">Riwayat publik @{username}</h1>
      <p className="type-body mt-2 text-on-surface-variant">
        Hanya trip publik yang diizinkan tampil. Trip private dan profil yang menyembunyikan riwayat tidak muncul.
      </p>
      {items === null ? (
        <p className="type-body mt-4 text-on-surface-variant">Memuat…</p>
      ) : items.length === 0 ? (
        <p className="type-body mt-4 text-on-surface-variant">Tidak ada riwayat publik.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {items.map((row) => (
            <li key={row.title} className="card-surface px-4 py-3">
              <p className="type-label font-extrabold text-on-surface">{row.title}</p>
              <p className="type-caption text-on-surface-variant">{row.visibility}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

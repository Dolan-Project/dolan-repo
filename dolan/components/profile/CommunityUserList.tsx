"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";

type Person = {
  id: string;
  username: string;
  displayName: string;
};

type CommunityUserListProps = {
  username: string;
  kind: "followers" | "following";
  title: string;
};

export function CommunityUserList({ username, kind, title }: CommunityUserListProps) {
  const [items, setItems] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/v1/users/${username}/${kind}`, {
        credentials: "include",
      });
      const json = (await response.json()) as {
        success: boolean;
        data?: { items: Person[] };
        error?: { message: string };
      };
      if (cancelled) return;
      if (!json.success) {
        setError(json.error?.message ?? "Gagal memuat daftar");
        setItems([]);
        return;
      }
      setItems(json.data?.items ?? []);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [username, kind]);

  return (
    <div className="mx-auto max-w-[720px] px-margin py-6 md:px-margin-desktop md:py-8">
      <Link href={ROUTES.profilUser(username)} className="type-caption font-semibold text-primary">
        ← Kembali ke profil @{username}
      </Link>
      <h1 className="type-title mt-3 text-on-surface">{title}</h1>
      {error ? <p className="type-body mt-3 text-error">{error}</p> : null}
      {items === null ? (
        <p className="type-body mt-4 text-on-surface-variant">Memuat…</p>
      ) : items.length === 0 ? (
        <p className="type-body mt-4 text-on-surface-variant">Belum ada pengguna di daftar ini.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {items.map((person) => (
            <li key={person.id}>
              <Link
                href={ROUTES.profilUser(person.username)}
                className="card-surface flex min-h-14 items-center justify-between px-4 py-3"
              >
                <span>
                  <span className="type-label font-extrabold text-on-surface">{person.displayName}</span>
                  <span className="ml-2 type-caption text-on-surface-variant">@{person.username}</span>
                </span>
                <span className="type-caption text-primary">Lihat profil</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

type CreatedLink = {
  id: string;
  url: string;
  expiresAt: string | null;
  permittedFields: string[];
};

type ShareLinkPanelProps = {
  tripId: string;
};

const PREVIEW_FIELDS_MESSAGE =
  "Link privat terbatas menampilkan field yang diizinkan (judul, kota tujuan, tanggal, ringkasan, hari/stop itinerary). Origin privat, email, dan koordinat presisi tidak ikut.";

async function readJson<T>(response: Response): Promise<
  | { success: true; data: T }
  | { success: false; error?: { message?: string } }
> {
  return (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };
}

export function ShareLinkPanel({ tripId }: ShareLinkPanelProps) {
  const [links, setLinks] = useState<CreatedLink[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function onCreate() {
    setPending(true);
    setError("");
    const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/share-links`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await readJson<{
      id: string;
      url: string;
      expiresAt: string | null;
      permittedFields: string[];
      token?: string;
    }>(response);
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Gagal membuat share link");
      return;
    }
    setLinks((current) => [
      {
        id: json.data.id,
        url: json.data.url,
        expiresAt: json.data.expiresAt,
        permittedFields: json.data.permittedFields,
      },
      ...current,
    ]);
  }

  async function onRevoke(linkId: string) {
    setPending(true);
    setError("");
    const response = await fetch(
      `/api/v1/trips/${encodeURIComponent(tripId)}/share-links/${encodeURIComponent(linkId)}/revoke`,
      { method: "POST", credentials: "include" },
    );
    const json = await readJson<{ revoked: boolean }>(response);
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Gagal mencabut share link");
      return;
    }
    setLinks((current) => current.filter((link) => link.id !== linkId));
  }

  async function onCopy(link: CreatedLink) {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId((current) => (current === link.id ? null : current)), 2000);
    } catch {
      setError("Tidak dapat menyalin URL. Salin manual dari kolom di bawah.");
    }
  }

  return (
    <section className="card-surface p-5">
      <p className="type-micro uppercase text-secondary">Share privat</p>
      <h2 className="type-subtitle mt-1">Link itinerary terbatas</h2>
      <p className="type-caption mt-1 text-on-surface-variant">{PREVIEW_FIELDS_MESSAGE}</p>

      <button type="button" className="btn-primary mt-4" disabled={pending} onClick={() => void onCreate()}>
        {pending ? "Memproses…" : "Buat share link"}
      </button>

      {links.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {links.map((link) => (
            <li key={link.id} className="rounded-2xl bg-surface-container-low p-3">
              <p className="type-label text-on-surface">URL (token hanya tampil sekali)</p>
              <input
                className="field-input mt-2 w-full type-caption"
                readOnly
                value={link.url}
                onFocus={(event) => event.currentTarget.select()}
              />
              <p className="mt-2 type-caption text-on-surface-variant">
                Field: {link.permittedFields.join(", ")}
                {link.expiresAt
                  ? ` · kedaluwarsa ${new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(link.expiresAt))}`
                  : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-ghost !min-h-10" disabled={pending} onClick={() => void onCopy(link)}>
                  {copiedId === link.id ? "Tersalin" : "Salin URL"}
                </button>
                <button
                  type="button"
                  className="btn-secondary !min-h-10"
                  disabled={pending}
                  onClick={() => void onRevoke(link.id)}
                >
                  Cabut link
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 type-caption text-on-surface-variant">
          Belum ada link aktif di sesi ini. Link yang sudah dibuat sebelumnya hanya bisa dicabut jika ID-nya masih
          tersimpan.
        </p>
      )}

      {error ? (
        <p className="mt-3 rounded-xl bg-error-container px-3 py-2 type-caption text-on-error-container" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

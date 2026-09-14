"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";

type PreviewDay = {
  dayNumber?: number;
  title?: string | null;
  stops?: Array<{ name?: string; startTime?: string | null }>;
};

type SharePreview = {
  tripId: string;
  permittedFields: string[];
  preview: {
    title?: string;
    destinationCity?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    summary?: string | null;
    days?: PreviewDay[];
  };
};

export default function SharePreviewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharePreview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    void fetch(`/api/v1/share/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          success: boolean;
          data?: SharePreview;
          error?: { message?: string };
        };
        if (!response.ok || !payload.success || !payload.data) {
          setError(payload.error?.message ?? "Share link tidak tersedia.");
          return;
        }
        setData(payload.data);
      })
      .catch(() => setError("Share link tidak dapat dimuat."));
  }, [token]);

  const preview = data?.preview;
  const days = Array.isArray(preview?.days) ? preview.days : [];

  return (
    <main className="mx-auto min-h-[70vh] max-w-3xl px-margin py-10 md:px-margin-desktop">
      <section className="card-surface p-6 md:p-9">
        <p className="type-micro uppercase text-secondary">Itinerary publik terbatas</p>
        {error ? (
          <p className="mt-4 rounded-xl bg-error-container p-4 text-on-error-container" role="alert">
            {error}
          </p>
        ) : !preview ? (
          <p className="mt-4 type-body text-on-surface-variant">Memuat preview…</p>
        ) : (
          <>
            <h1 className="type-title mt-2">{preview.title ?? "Trip Dolan"}</h1>
            <p className="type-body mt-2 text-on-surface-variant">
              {preview.destinationCity ?? "Tujuan"}
              {preview.startDate || preview.endDate
                ? ` · ${preview.startDate ?? "?"} – ${preview.endDate ?? "?"}`
                : ""}
            </p>
            {preview.summary ? (
              <p className="mt-4 type-body text-on-surface">{preview.summary}</p>
            ) : null}

            {days.length > 0 ? (
              <ol className="mt-6 space-y-4">
                {days.map((day, index) => (
                  <li key={`${day.dayNumber ?? index}`} className="rounded-2xl bg-surface-container-low p-4">
                    <p className="type-label text-primary">
                      Hari {day.dayNumber ?? index + 1}
                      {day.title ? ` · ${day.title}` : ""}
                    </p>
                    <ul className="mt-2 space-y-1 type-caption text-on-surface-variant">
                      {(day.stops ?? []).map((stop, stopIndex) => (
                        <li key={`${stop.name ?? "stop"}-${stopIndex}`}>
                          {stop.startTime ? `${stop.startTime} · ` : ""}
                          {stop.name ?? "Stop"}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-6 type-caption text-on-surface-variant">
                Detail hari/stop belum tersedia pada link ini.
              </p>
            )}

            <p className="mt-6 rounded-xl bg-primary-fixed/40 p-4 type-caption text-on-surface-variant">
              Preview ini tidak menampilkan data privat (asal pribadi, email, atau koordinat presisi).
              {data?.permittedFields?.length
                ? ` Field diizinkan: ${data.permittedFields.join(", ")}.`
                : ""}
            </p>
          </>
        )}
        <Link href={ROUTES.beranda} className="btn-ghost mt-6 inline-flex">
          Kembali ke beranda
        </Link>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

const steps = [
  "Pilih Jalur",
  "Dasar Trip",
  "Budget",
  "AI Generator",
  "Editor",
  "Review",
] as const;

export function CreateTripWizard() {
  const [path, setPath] = useState<"known" | "ai">("known");

  return (
    <div className="mx-auto max-w-3xl px-margin py-8 md:px-margin-desktop md:py-12">
      <div className="mb-8 hidden items-center justify-between sm:flex">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full type-micro ${
                i === 0
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {i + 1}
            </span>
            <span className="type-micro mt-1 text-on-surface-variant">{label}</span>
          </div>
        ))}
      </div>

      <div className="mb-6 text-center">
        <span className="chip bg-primary-fixed text-primary">
          Langkah 1 dari 6
        </span>
        <h1 className="type-title mt-3 text-on-surface">
          Bagaimana kamu ingin memulai rencana perjalanan ini?
        </h1>
        <p className="type-body mx-auto mt-2 max-w-xl text-on-surface-variant">
          Pilih cara yang paling nyaman. Itinerary tetap bisa disesuaikan nanti.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setPath("known")}
          className={`card-surface p-6 text-left ${
            path === "known" ? "ring-2 ring-primary" : ""
          }`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed text-2xl">
            📍
          </span>
          <h2 className="type-subtitle mt-4 text-on-surface">
            Aku sudah punya tujuan
          </h2>
          <p className="type-body mt-2 text-on-surface-variant">
            Susun itinerary dari destinasi yang sudah kamu tentukan, misalnya
            Labuan Bajo atau Bali.
          </p>
          <span className="type-label mt-4 inline-flex items-center gap-1 text-primary">
            Rekomendasi rute instan
            <Icon name="arrow_forward" className="text-[16px]" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPath("ai")}
          className={`card-surface p-6 text-left ${
            path === "ai" ? "ring-2 ring-primary" : ""
          }`}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary-fixed text-2xl">
            ✨
          </span>
          <h2 className="type-subtitle mt-4 text-on-surface">
            Bantu AI pilih tujuan
          </h2>
          <p className="type-body mt-2 text-on-surface-variant">
            Dapatkan rekomendasi destinasi berdasarkan waktu, budget, dan gaya
            bertualangmu.
          </p>
          <span className="type-label mt-4 inline-flex items-center gap-1 text-on-surface-variant">
            Kurasi berdasarkan preferensi
            <Icon name="arrow_forward" className="text-[16px]" />
          </span>
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-primary-fixed bg-primary-fixed/30 p-4">
        <div>
          <p className="type-label text-on-surface">Destinasi terpilih: Bali</p>
          <p className="type-caption text-on-surface-variant">
            Bisa diganti kapan saja sebelum publish.
          </p>
        </div>
        <Link href={ROUTES.itineraryBali} className="btn-primary !min-h-10">
          Lanjut
        </Link>
      </div>
    </div>
  );
}

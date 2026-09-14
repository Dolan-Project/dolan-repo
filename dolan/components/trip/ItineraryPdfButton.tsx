"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

type ItineraryPdfButtonProps = {
  tripId: string;
  className?: string;
  label?: string;
};

export function ItineraryPdfButton({
  tripId,
  className = "btn-ghost !min-h-9 !px-3 !text-xs",
  label = "Unduh PDF",
}: ItineraryPdfButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onDownload() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/itinerary.pdf`, {
        credentials: "include",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(payload?.error?.message ?? "Gagal mengunduh PDF");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "itinerary.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal mengunduh PDF");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" className={className} disabled={pending} onClick={() => void onDownload()}>
        <Icon name="arrow_downward" /> {pending ? "Mengunduh…" : label}
      </button>
      {error ? <span className="type-caption text-error">{error}</span> : null}
    </span>
  );
}

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ItineraryPdfButton } from "./ItineraryPdfButton";
import {
  googleMapsDirectionsUrl,
  hydrateItineraryPlaces,
  itineraryMapMarkers,
} from "@/lib/template-itinerary";
import type { EditableItineraryDay, ItineraryEditorSnapshot } from "@dolan/shared";

type ShareRouteModalProps = {
  tripId: string;
  tripTitle: string;
  onClose: () => void;
};

function daysFromSnapshot(snapshot: ItineraryEditorSnapshot | null): EditableItineraryDay[] {
  if (!snapshot) return [];
  const active = snapshot.versions.find((version) => version.id === snapshot.activeVersionId);
  return active?.days ?? snapshot.versions[0]?.days ?? [];
}

export function ShareRouteModal({ tripId, tripTitle, onClose }: ShareRouteModalProps) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function createLink() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/itinerary`, {
        credentials: "include",
      });
      const json = (await response.json()) as {
        success?: boolean;
        data?: ItineraryEditorSnapshot;
        error?: { message?: string };
      };
      const snapshot = json.success ? json.data ?? null : null;
      const city = snapshot?.destinationCity ?? "";
      const markers = itineraryMapMarkers(hydrateItineraryPlaces(daysFromSnapshot(snapshot), city), null, city);
      const url =
        googleMapsDirectionsUrl(markers) ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tripTitle || city || "Indonesia")}`;
      setLink(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (reason) {
      const fallback = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tripTitle || "Indonesia")}`;
      setLink(fallback);
      try {
        await navigator.clipboard.writeText(fallback);
        setCopied(true);
      } catch {
        setError(reason instanceof Error ? reason.message : "Salin link Google Maps secara manual.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="share-route-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="type-micro font-extrabold uppercase tracking-[0.16em] text-primary">Bagikan rute</p>
            <h2 id="share-route-title" className="mt-1 text-lg font-extrabold text-on-surface">{tripTitle}</h2>
          </div>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100" onClick={onClose} aria-label="Tutup">
            <Icon name="close" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <button type="button" className="btn-primary w-full !justify-center" disabled={pending} onClick={() => void createLink()}>
            <Icon name="link" /> {pending ? "Menyiapkan peta…" : copied ? "Link Google Maps tersalin" : "Salin link Google Maps"}
          </button>
          <ItineraryPdfButton tripId={tripId} className="btn-ghost w-full !justify-center" label="Unduh PDF itinerary" />
          {link ? (
            <input className="field-input bg-white ring-1 ring-slate-200 type-caption" readOnly value={link} onFocus={(event) => event.currentTarget.select()} />
          ) : null}
          {error ? <p className="type-caption text-error" role="alert">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

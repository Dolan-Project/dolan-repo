"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cacheChosenItinerary, putOfflineItinerary } from "@/lib/offline/private-cache";
import { ROUTES } from "@/lib/routes";

type SaveOfflineItineraryButtonProps = {
  id?: string;
  title?: string;
  path?: string;
};

/** Persists chosen itinerary in IndexedDB for offline reading. Server sync is optional. */
export function SaveOfflineItineraryButton({
  id,
  title,
  path = ROUTES.tripSaya,
}: SaveOfflineItineraryButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!id || !title) {
      setMessage("Data itinerary belum lengkap untuk disimpan offline.");
      return;
    }
    setPending(true);
    setMessage(null);
    const payload = { id, title, path };
    try {
      await putOfflineItinerary(payload);
      await cacheChosenItinerary(payload.path);
    } catch {
      setPending(false);
      setMessage("Browser menolak penyimpanan offline.");
      return;
    }

    setPending(false);
    setMessage("Itinerary disimpan di perangkat untuk dibaca offline.");
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button type="button" className="btn-ghost" disabled={pending} onClick={() => void onClick()}>
        <Icon name="bookmark" className="text-[16px]" />
        {pending ? "Menyimpan…" : "Simpan offline"}
      </button>
      {message ? <p className="max-w-[16rem] type-caption text-on-surface-variant">{message}</p> : null}
    </div>
  );
}

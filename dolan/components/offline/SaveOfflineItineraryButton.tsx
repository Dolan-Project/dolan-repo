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

export function SaveOfflineItineraryButton({
  id = "bali-3h2m",
  title = "Trip ke Bali 3H2M",
  path = ROUTES.itineraryBali,
}: SaveOfflineItineraryButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setMessage(null);
    const payload = { id, title, path };
    const response = await fetch("/api/v1/offline/itineraries", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };
    if (!json.success) {
      setPending(false);
      setMessage(json.error?.message ?? "Tidak bisa menyimpan offline");
      return;
    }
    await putOfflineItinerary(payload);
    await cacheChosenItinerary(payload.path);
    setPending(false);
    setMessage("Itinerary ini disimpan untuk dibaca offline.");
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

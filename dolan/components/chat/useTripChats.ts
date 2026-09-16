"use client";

import { useEffect, useState } from "react";
import type { MyTripSummary } from "@/lib/contracts";

export function useTripChats() {
  const [trips, setTrips] = useState<MyTripSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/v1/trips/me?role=hosted", { credentials: "include", signal: controller.signal }),
      fetch("/api/v1/trips/me?role=joined", { credentials: "include", signal: controller.signal }),
    ])
      .then(async ([hosted, joined]) => {
        const read = async (response: Response) => {
          if (!response.ok) return [] as MyTripSummary[];
          const payload = (await response.json()) as { data?: { items?: MyTripSummary[] } | MyTripSummary[] };
          return Array.isArray(payload.data) ? payload.data : payload.data?.items ?? [];
        };
        const next = [...(await read(hosted)), ...(await read(joined))];
        const seen = new Set<string>();
        setTrips(next.filter((trip) => (seen.has(trip.id) ? false : (seen.add(trip.id), true))));
      })
      .catch(() => {
        if (!controller.signal.aborted) setTrips([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { trips, loading };
}

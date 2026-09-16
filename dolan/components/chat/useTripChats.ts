"use client";

import { useEffect, useState } from "react";
import type { MyTripSummary } from "@/lib/contracts";
import { connectDolanSocket } from "@/lib/realtime/dolan-socket";
import { readApiJson } from "@/lib/auth/read-api-json";

export function useTripChats() {
  const [trips, setTrips] = useState<MyTripSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [hosted, joined] = await Promise.all([
          fetch("/api/v1/trips/me?role=hosted", { credentials: "include", signal: controller.signal }),
          fetch("/api/v1/trips/me?role=joined", { credentials: "include", signal: controller.signal }),
        ]);
        const read = async (response: Response) => {
          if (!response.ok) return [] as MyTripSummary[];
          try {
            const payload = await readApiJson<{ data?: { items?: MyTripSummary[] } | MyTripSummary[] }>(response);
            return Array.isArray(payload.data) ? payload.data : payload.data?.items ?? [];
          } catch {
            return [] as MyTripSummary[];
          }
        };
        const next = [...(await read(hosted)), ...(await read(joined))];
        const seen = new Set<string>();
        setTrips(next.filter((trip) => (seen.has(trip.id) ? false : (seen.add(trip.id), true))));
      } catch {
        if (!controller.signal.aborted) setTrips([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    const socket = connectDolanSocket();
    const onDeleted = (payload: { tripId?: string }) => {
      if (!payload?.tripId) {
        void load();
        return;
      }
      setTrips((current) => current.filter((trip) => trip.id !== payload.tripId));
    };
    socket.on("trip.deleted", onDeleted);
    return () => {
      controller.abort();
      socket.off("trip.deleted", onDeleted);
    };
  }, []);

  return { trips, loading };
}

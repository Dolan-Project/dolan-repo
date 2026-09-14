export type TripForFeedback = {
  id: string;
  title: string;
  status: string;
  hostUsername: string | null;
};

export function completedTripsForFeedback(trips: TripForFeedback[]): TripForFeedback[] {
  const seen = new Set<string>();
  const rows: TripForFeedback[] = [];
  for (const trip of trips) {
    if (trip.status !== "COMPLETED") continue;
    if (seen.has(trip.id)) continue;
    seen.add(trip.id);
    rows.push(trip);
  }
  return rows;
}

export function reviewTripForPeer(
  trips: TripForFeedback[],
  peerUsername: string,
  preferredTripId?: string | null,
): TripForFeedback | null {
  const completed = completedTripsForFeedback(trips);
  const needle = peerUsername.trim().toLowerCase();
  if (preferredTripId) {
    const preferred = completed.find((trip) => trip.id === preferredTripId);
    if (preferred) return preferred;
  }
  if (!needle) return null;
  return completed.find((trip) => (trip.hostUsername ?? "").toLowerCase() === needle) ?? null;
}

export function tripsFromMinePayload(payload: unknown): TripForFeedback[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  const rows: TripForFeedback[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const row = item as {
      id?: unknown;
      title?: unknown;
      status?: unknown;
      host?: { username?: unknown } | null;
    };
    if (typeof row.id !== "string" || typeof row.status !== "string") continue;
    if (row.status !== "COMPLETED") continue;
    rows.push({
      id: row.id,
      title: typeof row.title === "string" ? row.title : row.id,
      status: row.status,
      hostUsername: typeof row.host?.username === "string" ? row.host.username : null,
    });
  }
  return rows;
}

export type NavStop = { name: string; latitude?: number | null; longitude?: number | null };

function point(stop: NavStop) {
  if (stop.latitude != null && stop.longitude != null) return `${stop.latitude},${stop.longitude}`;
  return stop.name;
}

export function googleMapsDirUrl(stops: NavStop[]): string | null {
  const usable = stops.filter((stop) => stop.name || (stop.latitude != null && stop.longitude != null));
  if (usable.length === 0) return null;
  const origin = encodeURIComponent(point(usable[0]!));
  const destination = encodeURIComponent(point(usable[usable.length - 1]!));
  const mid = usable.slice(1, -1).map((stop) => encodeURIComponent(point(stop))).join("%7C");
  const base = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  return mid ? `${base}&waypoints=${mid}` : base;
}

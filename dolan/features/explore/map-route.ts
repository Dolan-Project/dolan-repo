export type RouteStop = { lat: number; lng: number };

export function chunkRouteStops<T extends RouteStop>(stops: T[], maxIntermediate = 8): T[][] {
  if (stops.length < 2) return [];
  const chunks: T[][] = [];
  let start = 0;
  while (start < stops.length - 1) {
    const end = Math.min(start + maxIntermediate + 1, stops.length - 1);
    chunks.push(stops.slice(start, end + 1));
    start = end;
  }
  return chunks;
}

export function decodePolyline(encoded: string) {
  const path: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    path.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return path;
}

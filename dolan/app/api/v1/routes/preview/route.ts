import { proxyToExpress } from "@/lib/auth/express-proxy";
import { jsonResult } from "@/lib/auth/api-response";
import { shouldUseMockApi } from "@/lib/auth/use-mock";

type RoutePoint = { lat: number; lng: number };

async function encodedDrivingPolyline(from: RoutePoint, to: RoutePoint, key: string) {
  const directions = new URL("https://maps.googleapis.com/maps/api/directions/json");
  directions.searchParams.set("origin", `${from.lat},${from.lng}`);
  directions.searchParams.set("destination", `${to.lat},${to.lng}`);
  directions.searchParams.set("mode", "driving");
  directions.searchParams.set("region", "id");
  directions.searchParams.set("language", "id");
  directions.searchParams.set("key", key);
  try {
    const response = await fetch(directions.toString());
    if (response.ok) {
      const payload = (await response.json()) as {
        status?: string;
        routes?: Array<{ overview_polyline?: { points?: string } }>;
      };
      const encoded = payload.routes?.[0]?.overview_polyline?.points;
      if (payload.status === "OK" && encoded) return encoded;
    }
  } catch {
    /* try Routes API below */
  }
  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: "DRIVE",
        languageCode: "id",
        regionCode: "ID",
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { routes?: Array<{ polyline?: { encodedPolyline?: string } }> };
    return payload.routes?.[0]?.polyline?.encodedPolyline ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!shouldUseMockApi()) {
    return proxyToExpress(request, "/api/v1/routes/preview");
  }

  const body = (await request.json().catch(() => ({}))) as { points?: RoutePoint[] };
  const points = Array.isArray(body.points) ? body.points.filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng)) : [];
  if (points.length < 2) {
    return jsonResult({ success: true, data: { segments: [] } }, 200);
  }

  const key = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || "";
  if (!key) {
    return jsonResult({ success: true, data: { segments: [] } }, 200);
  }

  const segments = [];
  for (let index = 1; index < points.length; index += 1) {
    const encodedPolyline = await encodedDrivingPolyline(points[index - 1]!, points[index]!, key);
    segments.push(
      encodedPolyline
        ? { ok: true, encodedPolyline, travelMode: "DRIVE" }
        : { ok: false, reason: "Rute jalan tidak tersedia untuk segmen ini." },
    );
  }
  return jsonResult({ success: true, data: { segments } }, 200);
}

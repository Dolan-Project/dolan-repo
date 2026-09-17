import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { searchGeoPlaces } from "@/mocks/geo";

function catalogPlaces(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const city = url.searchParams.get("city") ?? undefined;
  const hits = searchGeoPlaces(query, { nearbyCity: city, includeRegions: true }).slice(0, 8);
  return Response.json({
    success: true,
    data: hits.map((place) => ({
      googlePlaceId: place.id,
      name: place.label,
      city: place.city,
      latitude: place.latitude,
      longitude: place.longitude,
      formattedAddress: place.label,
    })),
    pagination: {
      page: 1,
      limit: 8,
      totalItems: hits.length,
      totalPages: 1,
      hasNextPage: false,
    },
  });
}

export async function GET(request: Request) {
  if (shouldUseMockApi()) return catalogPlaces(request);
  const proxied = await proxyToExpress(request, "/api/v1/search/places");
  if (proxied.ok) return proxied;
  return catalogPlaces(request);
}

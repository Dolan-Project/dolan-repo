import { proxyToExpress } from "@/lib/auth/express-proxy";
import { jsonResult } from "@/lib/auth/api-response";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { INDONESIA_PROVINCES } from "@/lib/provinces";

export async function GET(request: Request) {
  if (!shouldUseMockApi()) {
    const url = new URL(request.url);
    return proxyToExpress(request, `/api/v1/templates${url.search}`);
  }

  const url = new URL(request.url);
  const city = (url.searchParams.get("city") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") ?? 12) || 12));
  const filtered = INDONESIA_PROVINCES.filter((province) => {
    if (!city) return true;
    const hay = `${province.name} ${province.capital} ${province.template.title}`.toLowerCase();
    return hay.includes(city);
  });
  const start = (page - 1) * limit;
  const slice = filtered.slice(start, start + limit);
  const data = slice.map((province) => ({
    id: province.template.id,
    title: province.template.title,
    city: province.name,
    durationDays: province.template.durationDays,
    source: "OFFICIAL" as const,
    sourceLabel: "Template resmi",
    usageCount: 0,
    popularityLabel: null,
    coverPlace: null,
  }));
  return Response.json(
    {
      success: true,
      data,
      pagination: {
        page,
        limit,
        totalItems: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
        hasNextPage: start + limit < filtered.length,
      },
    },
    { status: 200 },
  );
}

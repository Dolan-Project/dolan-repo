import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { jsonResult } from "@/lib/auth/api-response";
import { INDONESIA_PROVINCES } from "@/lib/provinces";

export async function GET(request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  if (!shouldUseMockApi()) return proxyToExpress(request, `/api/v1/templates/${encodeURIComponent(templateId)}`);
  const province = INDONESIA_PROVINCES.find((item) => item.template.id === templateId);
  if (!province) return jsonResult({ success: false, error: { code: "NOT_FOUND", message: "Template tidak ditemukan", requestId: crypto.randomUUID() } }, 404);
  return jsonResult({ success: true, data: { id: templateId, title: province.template.title, description: province.template.description, city: province.name, durationDays: province.template.durationDays, source: "CURATED", sourceLabel: "Kurasi Dolan", usageCount: 0, popularityLabel: "Populer di Dolan", coverPlace: null, transportMode: province.template.transportMode, days: Array.from({ length: province.template.durationDays }, (_, i) => ({ id: `${province.slug}-${i + 1}`, dayNumber: i + 1, title: `Hari ${i + 1}`, stops: province.template.stops.filter((stop) => stop.day === i + 1).map((stop) => ({ sequence: stop.sequence, activityType: "VISIT", customTitle: stop.name, durationMinutes: stop.durationMinutes, notes: stop.notes, place: null })) })) } }, 200);
}

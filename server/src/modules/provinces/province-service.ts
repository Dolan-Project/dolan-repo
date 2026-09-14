import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getModels } from "@dolan/database";
import type { ItineraryTemplateDetail, ProvinceDetail, ProvinceSummary } from "@dolan/shared";
import { notFound } from "../../lib/api-error.ts";

type CatalogRow = {
  slug: string; name: string; capital: string; description: string; heroQuery: string; featuredRank: number;
  places: Array<{ name: string; city: string; rank: number; description: string; googleMapsUrl: string }>;
  template: { id: string; title: string; description: string; durationDays: number; transportMode: string; budgetLow: number; budgetHigh: number; stops: Array<{ day: number; sequence: number; name: string; durationMinutes: number; notes: string }> };
};

const catalogPath = fileURLToPath(new URL("../../../../database/data/indonesia-provinces.json", import.meta.url));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as CatalogRow[];

function fallbackSummary(row: CatalogRow): ProvinceSummary {
  return { id: row.slug, slug: row.slug, name: row.name, capital: row.capital, description: row.description, heroQuery: row.heroQuery, featuredRank: row.featuredRank };
}

function fallbackDetail(row: CatalogRow): ProvinceDetail {
  return {
    ...fallbackSummary(row),
    places: row.places.map((place) => ({ id: `${row.slug}-${place.rank}`, ...place, googlePlaceId: null, searchQuery: `${place.name}, ${row.name}, Indonesia` })),
    template: {
      id: row.template.id, title: row.template.title, description: row.template.description,
      city: row.capital, durationDays: row.template.durationDays, transportMode: row.template.transportMode,
      source: "CURATED", sourceLabel: "Kurasi Dolan", usageCount: 0, popularityLabel: "Populer di Dolan", coverPlace: null,
      days: Array.from({ length: row.template.durationDays }, (_, dayIndex) => ({
        id: `${row.slug}-day-${dayIndex + 1}`, dayNumber: dayIndex + 1, title: `Hari ${dayIndex + 1} di ${row.name}`,
        stops: row.template.stops.filter((stop) => stop.day === dayIndex + 1).map((stop) => ({ sequence: stop.sequence, activityType: "VISIT", customTitle: stop.name, durationMinutes: stop.durationMinutes, notes: stop.notes, place: null })),
      })),
    },
  };
}

export class ProvinceService {
  constructor(private readonly useDatabase = false) {}

  async list(q = ""): Promise<ProvinceSummary[]> {
    const needle = q.trim().toLocaleLowerCase("id-ID");
    if (!this.useDatabase) return catalog.filter((item) => !needle || item.name.toLocaleLowerCase("id-ID").includes(needle)).map(fallbackSummary);
    const { Province } = getModels();
    const rows = await Province.findAll({ order: [["featuredRank", "ASC"]] });
    return rows.map((row) => row.toJSON()).filter((item) => !needle || item.name.toLocaleLowerCase("id-ID").includes(needle));
  }

  async detail(slug: string): Promise<ProvinceDetail> {
    if (!this.useDatabase) {
      const found = catalog.find((item) => item.slug === slug);
      if (!found) throw notFound("NOT_FOUND", "Provinsi tidak ditemukan");
      return fallbackDetail(found);
    }
    const { Province, ProvincePlace, ItineraryTemplate, TemplateDay, TemplateStop, Place } = getModels();
    const province = await Province.findOne({ where: { slug }, include: [{ model: ProvincePlace, as: "places" }, { model: ItineraryTemplate, as: "templates", required: false, where: { publicationStatus: "PUBLISHED" }, include: [{ model: TemplateDay, as: "days", include: [{ model: TemplateStop, as: "stops", include: [{ model: Place, as: "place", required: false }] }] }] }] });
    if (!province) throw notFound("NOT_FOUND", "Provinsi tidak ditemukan");
    const raw = province.toJSON() as unknown as Record<string, unknown> & { places: Array<Record<string, unknown>>; templates: Array<Record<string, unknown> & { days: Array<Record<string, unknown> & { stops: Array<Record<string, unknown>> }> }> };
    const templateRaw = raw.templates?.[0];
    const template: ItineraryTemplateDetail | null = templateRaw ? {
      id: String(templateRaw.id), title: String(templateRaw.title), description: templateRaw.description == null ? null : String(templateRaw.description), city: String(templateRaw.city),
      durationDays: Number(templateRaw.durationDays), transportMode: templateRaw.transportMode == null ? null : String(templateRaw.transportMode), source: "CURATED", sourceLabel: "Kurasi Dolan",
      usageCount: Number(templateRaw.usageCount ?? 0), popularityLabel: "Populer di Dolan", coverPlace: null,
      days: (templateRaw.days ?? []).sort((a,b) => Number(a.dayNumber)-Number(b.dayNumber)).map((day) => ({ id: String(day.id), dayNumber: Number(day.dayNumber), title: day.title == null ? null : String(day.title), stops: (day.stops ?? []).sort((a,b)=>Number(a.sequence)-Number(b.sequence)).map((stop) => ({ sequence: Number(stop.sequence), activityType: String(stop.activityType), customTitle: stop.customTitle == null ? null : String(stop.customTitle), durationMinutes: Number(stop.durationMinutes), notes: stop.notes == null ? null : String(stop.notes), place: null })) })),
    } : null;
    return {
      id: String(raw.id), slug: String(raw.slug), name: String(raw.name), capital: String(raw.capital), description: String(raw.description), heroQuery: String(raw.heroQuery), featuredRank: Number(raw.featuredRank),
      places: (raw.places ?? []).sort((a,b)=>Number(a.rank)-Number(b.rank)).map((place) => ({ id: String(place.id), name: String(place.name), city: String(place.city), description: String(place.description), googlePlaceId: place.googlePlaceId == null ? null : String(place.googlePlaceId), googleMapsUrl: String(place.googleMapsUrl), searchQuery: String(place.searchQuery), rank: Number(place.rank) })),
      template,
    };
  }
}

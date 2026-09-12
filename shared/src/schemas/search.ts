import { z } from "zod";

function singleQueryValue(value: unknown): unknown {
  if (Array.isArray(value)) return value[0];
  return value;
}

const optionalString = z.preprocess(
  (value) => {
    const single = singleQueryValue(value);
    if (single === undefined || single === null || single === "") return undefined;
    return String(single);
  },
  z.string().trim().max(120).optional(),
);

const requiredQueryString = z.preprocess(
  (value) => {
    const single = singleQueryValue(value);
    if (single === undefined || single === null) return "";
    return String(single);
  },
  z.string().trim().min(1).max(200),
);

const pageSchema = z.preprocess(
  (value) => singleQueryValue(value) ?? 1,
  z.coerce.number().int().min(1).max(100).default(1),
);

const limitSchema = z.preprocess(
  (value) => singleQueryValue(value) ?? 10,
  z.coerce.number().int().min(1).max(20).default(10),
);

const optionalCoord = z.preprocess(
  (value) => {
    const single = singleQueryValue(value);
    if (single === undefined || single === null || single === "") return undefined;
    return single;
  },
  z.coerce.number().min(-90).max(90).optional(),
);

const optionalLng = z.preprocess(
  (value) => {
    const single = singleQueryValue(value);
    if (single === undefined || single === null || single === "") return undefined;
    return single;
  },
  z.coerce.number().min(-180).max(180).optional(),
);

export const citySearchQuerySchema = z.object({
  q: optionalString,
});

export const placeSearchQuerySchema = z.object({
  q: requiredQueryString,
  city: optionalString,
  sort: z.preprocess(singleQueryValue, z.enum(["relevance", "popular", "nearest"]).default("relevance")),
  lat: optionalCoord,
  lng: optionalLng,
  page: pageSchema,
  limit: limitSchema,
});

export const tripSearchQuerySchema = z.object({
  q: optionalString,
  city: optionalString,
  sort: z.preprocess(singleQueryValue, z.enum(["recent", "popular"]).default("recent")),
  dateFrom: optionalString,
  dateTo: optionalString,
  page: pageSchema,
  limit: limitSchema,
});

export const templateSearchQuerySchema = z.object({
  city: optionalString,
  sort: z.preprocess(singleQueryValue, z.enum(["recent", "popular"]).default("popular")),
  page: pageSchema,
  limit: limitSchema,
});

export const paginationQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
});

const requiredPhotoName = z.preprocess(
  (value) => {
    const single = singleQueryValue(value);
    if (single === undefined || single === null) return "";
    return String(single);
  },
  z.string().trim().min(1).max(2048),
);

export const placePhotoQuerySchema = z.object({
  name: requiredPhotoName,
});

export type CitySearchQuery = z.infer<typeof citySearchQuerySchema>;
export type PlaceSearchQuery = z.infer<typeof placeSearchQuerySchema>;
export type TripSearchQuery = z.infer<typeof tripSearchQuerySchema>;
export type TemplateSearchQuery = z.infer<typeof templateSearchQuerySchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

import { Router } from "express";
import {
  SearchErrorCode,
  apiSuccess,
  citySearchQuerySchema,
  paginationQuerySchema,
  placePhotoQuerySchema,
  placeSearchQuerySchema,
  templateSearchQuerySchema,
  tripSearchQuerySchema,
  useTemplateBodySchema,
} from "@dolan/shared";
import { badRequest } from "../../lib/api-error.ts";
import { zodFields } from "../../lib/zod-fields.ts";
import { requireCapability } from "../../middleware/authorize.ts";
import type { SearchService } from "./search-service.ts";

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

export function createSearchRouter(search: SearchService) {
  const router = Router();

  router.get("/search/cities", requireCapability("read_public"), async (req, res, next) => {
    try {
      const parsed = citySearchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(SearchErrorCode.INVALID_FILTER, "Invalid city search", zodFields(parsed.error));
      }
      res.json(apiSuccess(await search.searchCities(parsed.data.q)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/search/places", requireCapability("read_public"), async (req, res, next) => {
    try {
      const parsed = placeSearchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(SearchErrorCode.INVALID_FILTER, "Invalid place search", zodFields(parsed.error));
      }
      res.json(await search.searchPlaces(parsed.data, req.actor ?? { kind: "guest" }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/search/trips", requireCapability("read_public"), async (req, res, next) => {
    try {
      const parsed = tripSearchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(SearchErrorCode.INVALID_FILTER, "Invalid trip search", zodFields(parsed.error));
      }
      res.json(await search.searchTrips(parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.get("/places/:googlePlaceId", requireCapability("read_public"), async (req, res, next) => {
    try {
      res.json(apiSuccess(await search.getPlace(param(req.params.googlePlaceId), req.actor ?? { kind: "guest" })));
    } catch (error) {
      next(error);
    }
  });

  router.get("/places/:googlePlaceId/photo", requireCapability("read_public"), async (req, res, next) => {
    try {
      const parsed = placePhotoQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(SearchErrorCode.INVALID_FILTER, "Invalid photo request", zodFields(parsed.error));
      }
      res.json(
        apiSuccess(
          await search.getPlacePhoto(param(req.params.googlePlaceId), parsed.data.name, req.actor ?? { kind: "guest" }),
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get("/places/:googlePlaceId/trips", requireCapability("read_public"), async (req, res, next) => {
    try {
      const parsed = paginationQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(SearchErrorCode.INVALID_FILTER, "Invalid pagination", zodFields(parsed.error));
      }
      res.json(await search.listPlaceTrips(param(req.params.googlePlaceId), parsed.data.page, parsed.data.limit));
    } catch (error) {
      next(error);
    }
  });

  router.get("/places/:googlePlaceId/templates", requireCapability("read_public"), async (req, res, next) => {
    try {
      const parsed = paginationQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(SearchErrorCode.INVALID_FILTER, "Invalid pagination", zodFields(parsed.error));
      }
      res.json(await search.listPlaceTemplates(param(req.params.googlePlaceId), parsed.data.page, parsed.data.limit));
    } catch (error) {
      next(error);
    }
  });

  router.get("/templates", requireCapability("read_public"), async (req, res, next) => {
    try {
      const parsed = templateSearchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw badRequest(SearchErrorCode.INVALID_CITY, "Invalid template search", zodFields(parsed.error));
      }
      res.json(await search.searchTemplates(parsed.data));
    } catch (error) {
      next(error);
    }
  });

  router.get("/templates/:id", requireCapability("read_public"), async (req, res, next) => {
    try {
      res.json(apiSuccess(await search.getTemplate(param(req.params.id))));
    } catch (error) {
      next(error);
    }
  });

  router.post("/templates/:id/use", requireCapability("create_draft"), async (req, res, next) => {
    try {
      const parsed = useTemplateBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw badRequest(SearchErrorCode.INVALID_PLAN_INPUT, "Invalid template plan", zodFields(parsed.error));
      }
      const result = await search.useTemplate(
        param(req.params.id),
        parsed.data,
        req.actor ?? { kind: "guest" },
        req.header("idempotency-key") ?? undefined,
      );
      res.status(201).json(apiSuccess(result));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

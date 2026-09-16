import { Router } from "express";
import { apiSuccess } from "@dolan/shared";
import { requireCapability } from "../../middleware/authorize.ts";
import type { ProvinceService } from "./province-service.ts";

export function createProvinceRouter(service: ProvinceService) {
  const router = Router();
  router.get("/provinces", requireCapability("read_public"), async (req, res, next) => {
    try { res.json(apiSuccess(await service.list(String(req.query.q ?? "")))); } catch (error) { next(error); }
  });
  router.get("/provinces/:slug", requireCapability("read_public"), async (req, res, next) => {
    try { res.json(apiSuccess(await service.detail(String(req.params.slug)))); } catch (error) { next(error); }
  });
  router.get("/search/suggestions", requireCapability("read_public"), async (req, res, next) => {
    try {
      const provinces = await service.list(String(req.query.q ?? ""));
      res.json(apiSuccess(provinces.slice(0, 8).map((province) => ({ id: province.id, type: "province", label: province.name, secondaryLabel: `Provinsi · Ibu kota ${province.capital}`, href: `/provinsi/${province.slug}` }))));
    } catch (error) { next(error); }
  });
  return router;
}

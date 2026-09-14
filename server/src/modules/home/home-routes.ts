import { Router } from "express";
import { requireLogin } from "../../middleware/authenticate.ts";
import { HomeFeedService, homeFeedSuccess } from "./home-service.ts";

export function createHomeRouter(home: HomeFeedService) {
  const router = Router();
  router.get("/home/feed", requireLogin, async (req, res, next) => {
    try {
      res.json(homeFeedSuccess(await home.build(req.actor ?? { kind: "guest" })));
    } catch (error) {
      next(error);
    }
  });
  return router;
}

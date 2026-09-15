import { Router } from "express";
import { apiPage, apiSuccess, presentInboxNotification } from "@dolan/shared";
import { requireLogin } from "../../middleware/authenticate.ts";
import { requireCapability, withTripContext } from "../../middleware/authorize.ts";
import type { ChatService } from "./chat-service.ts";

function attachAccess(chat: ChatService, capability: "read_chat" | "send_message") {
  return [
    requireLogin,
    async (req: import("express").Request, _res: import("express").Response, next: import("express").NextFunction) => {
      try {
        const tripId = String(req.params.tripId);
        const access = await chat.accessFor(tripId, req.authUser!.id);
        withTripContext({
          tripId,
          memberRole: access?.memberRole ?? null,
          membershipStatus: access?.membershipStatus ?? null,
          joinRequestStatus: access?.joinRequestStatus ?? null,
        })(req, _res, next);
      } catch (error) {
        next(error);
      }
    },
    requireCapability(capability),
  ] as const;
}

export function createChatRouter(chat: ChatService) {
  const router = Router();

  router.get("/trips/:tripId/messages", ...attachAccess(chat, "read_chat"), async (req, res, next) => {
    try {
      const messages = await chat.listMessages(String(req.params.tripId), req.authUser!.id, req.query);
      res.json(apiSuccess({ messages }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:tripId/messages", ...attachAccess(chat, "send_message"), async (req, res, next) => {
    try {
      const result = await chat.sendMessage(String(req.params.tripId), req.authUser!.id, req.body);
      res.status(result.created ? 201 : 200).json(apiSuccess(result.message));
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:tripId/messages/read", ...attachAccess(chat, "read_chat"), async (req, res, next) => {
    try {
      res.json(apiSuccess(await chat.markRead(String(req.params.tripId), req.authUser!.id, req.body)));
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:tripId/chat/leave", requireLogin, async (req, res, next) => {
    try {
      res.json(apiSuccess(await chat.evictFromRoom(String(req.params.tripId), req.authUser!.id)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/notifications", requireLogin, async (req, res, next) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      const result = await chat.listNotifications(req.authUser!.id, page, limit);
      const items = result.items.map((item) => ({
        ...item,
        ...presentInboxNotification(item),
      }));
      res.json({ ...apiPage(items, page, limit, result.total), unreadCount: result.unreadCount });
    } catch (error) {
      next(error);
    }
  });

  router.post("/notifications/:id/read", requireLogin, async (req, res, next) => {
    try {
      res.json(apiSuccess(await chat.markNotificationRead(req.authUser!.id, String(req.params.id))));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

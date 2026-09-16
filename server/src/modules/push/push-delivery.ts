import webpush from "web-push";
import { getModels } from "@dolan/database";
import { presentInboxNotification } from "@dolan/shared";
import { env } from "../../config/env.ts";
import { logger } from "../../lib/logger.ts";

let vapidReady = false;

function ensureVapid() {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
    vapidReady = true;
  }
  return true;
}

export function pushContentForNotification(input: {
  type: string;
  targetType: string;
  targetId: string;
  data?: Record<string, unknown>;
}) {
  const copy = presentInboxNotification(input);
  return { title: copy.title, body: copy.body, url: copy.href };
}

export async function deliverPushNotification(input: {
  recipientUserId: string;
  type: string;
  targetType: string;
  targetId: string;
  data?: Record<string, unknown>;
}) {
  if (!ensureVapid()) {
    logger.warn("Web push skipped: VAPID keys missing");
    return;
  }
  const content = pushContentForNotification(input);
  const payload = JSON.stringify(content);

  try {
    const { PushSubscription } = getModels();
    const subscriptions = await PushSubscription.findAll({
      where: { userId: input.recipientUserId, revokedAt: null },
    });
    if (subscriptions.length === 0) {
      logger.info("Web push skipped: no subscription", { userId: input.recipientUserId, type: input.type });
      return;
    }
    await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dhEncrypted,
                auth: subscription.authEncrypted,
              },
            },
            payload,
          );
        } catch (error) {
          const statusCode =
            typeof error === "object" && error !== null && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode)
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            await subscription.update({ revokedAt: new Date() });
          } else {
            logger.warn("Web push delivery failed", {
              userId: input.recipientUserId,
              endpoint: subscription.endpoint,
            });
          }
        }
      }),
    );
  } catch {
    /* database unavailable */
  }
}

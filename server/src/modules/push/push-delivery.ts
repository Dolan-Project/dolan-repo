import webpush from "web-push";
import { getModels } from "@dolan/database";
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
  const tripPath = input.targetType === "trip" ? `/trip/${input.targetId}` : "/notifikasi";
  switch (input.type) {
    case "message.created":
      return { title: "Pesan trip baru", body: "Ada pesan baru di grup perjalananmu.", url: tripPath };
    case "join.requested":
      return { title: "Pengajuan join trip", body: "Seseorang ingin bergabung ke trip-mu.", url: tripPath };
    case "join.accepted":
      return { title: "Pengajuan diterima", body: "Host menerima pengajuan join trip-mu.", url: tripPath };
    case "join.rejected":
      return { title: "Pengajuan ditolak", body: "Host menolak pengajuan join trip-mu.", url: tripPath };
    case "follower.created":
      return { title: "Pengikut baru", body: "Seseorang mulai mengikuti profilmu.", url: "/notifikasi" };
    case "feedback.invite":
      return { title: "Trip selesai", body: "Bantu komunitas dengan memberi ulasan.", url: tripPath };
    case "trip.invited":
      return {
        title: "Undangan trip",
        body: "Kamu diundang ke trip baru.",
        url: typeof input.data?.invitePath === "string" ? input.data.invitePath : tripPath,
      };
    default:
      return { title: "Notifikasi Dolan", body: "Ada pembaruan untukmu.", url: "/notifikasi" };
  }
}

export async function deliverPushNotification(input: {
  recipientUserId: string;
  type: string;
  targetType: string;
  targetId: string;
  data?: Record<string, unknown>;
}) {
  if (!ensureVapid()) return;
  const content = pushContentForNotification(input);
  const payload = JSON.stringify(content);

  try {
    const { PushSubscription } = getModels();
    const subscriptions = await PushSubscription.findAll({
      where: { userId: input.recipientUserId, revokedAt: null },
    });
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

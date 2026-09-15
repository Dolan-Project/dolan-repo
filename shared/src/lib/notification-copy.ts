export type InboxNotificationCopy = {
  title: string;
  body: string;
  href: string;
  tripId: string | null;
};

export function presentInboxNotification(input: {
  type: string;
  targetType?: string | null;
  targetId?: string | null;
  data?: Record<string, unknown> | string | null;
}): InboxNotificationCopy {
  const data = notificationData(input.data);
  const tripIdFromData = typeof data.tripId === "string" && data.tripId.trim() ? data.tripId.trim() : null;
  const tripId =
    tripIdFromData ?? (input.targetType === "trip" && input.targetId ? input.targetId : null);
  const tripTitle =
    typeof data.tripTitle === "string" && data.tripTitle.trim() ? data.tripTitle.trim() : null;
  const named = tripTitle ? `“${tripTitle}”` : null;
  const actorName = actorLabel(data);
  const preview = previewText(data);
  const invitePath = typeof data.invitePath === "string" ? data.invitePath : null;
  const decision = data.decision === "accept" || data.decision === "reject" ? data.decision : null;

  switch (input.type) {
    case "join_request.created":
    case "join.requested":
      return {
        title: "Pengajuan join trip",
        body: named ? `Ada yang ingin join ${named}.` : "Seseorang ingin bergabung ke trip-mu.",
        href: tripId ? `/trip/${tripId}` : "/notifikasi",
        tripId,
      };
    case "join.rejected":
      return {
        title: "Pengajuan ditolak",
        body: named ? `Host menolak pengajuanmu untuk ${named}.` : "Host menolak pengajuan join trip-mu.",
        href: tripId ? `/trip/${tripId}` : "/notifikasi",
        tripId,
      };
    case "join_request.reviewed":
    case "join.accepted":
      if (decision === "reject") {
        return {
          title: "Pengajuan ditolak",
          body: named ? `Host menolak pengajuanmu untuk ${named}.` : "Host menolak pengajuan join trip-mu.",
          href: tripId ? `/trip/${tripId}` : "/notifikasi",
          tripId,
        };
      }
      return {
        title: "Pengajuan diterima",
        body: named ? `Pengajuanmu untuk ${named} diterima.` : "Host menerima pengajuan join trip-mu.",
        href: tripId ? `/trip/${tripId}` : "/notifikasi",
        tripId,
      };
    case "message.created":
      return {
        title: tripTitle ?? "Grup perjalanan",
        body: preview ? `${actorName}: ${preview}` : `${actorName} mengirim pesan.`,
        href: tripId ? `/trip/${tripId}/chat` : "/notifikasi",
        tripId,
      };
    case "trip.cancelled":
      return {
        title: "Trip dibatalkan",
        body: named ? `${named} dibatalkan host.` : "Host membatalkan trip yang kamu ikuti.",
        href: tripId ? `/trip/${tripId}` : "/notifikasi",
        tripId,
      };
    case "trip.updated":
      return {
        title: "Trip diperbarui",
        body: named ? `Host memperbarui ${named}.` : "Host memperbarui rencana trip-mu.",
        href: tripId ? `/trip/${tripId}` : "/notifikasi",
        tripId,
      };
    case "member.left":
      return {
        title: "Peserta keluar",
        body: named ? `Seseorang keluar dari ${named}.` : "Seorang peserta keluar dari trip-mu.",
        href: tripId ? `/trip/${tripId}` : "/notifikasi",
        tripId,
      };
    case "comment.created":
      return {
        title: tripTitle
          ? `${actorName} memberikan komentar pada trip ${tripTitle}`
          : `${actorName} memberikan komentar pada trip-mu`,
        body: preview ? `${actorName}: ${preview}` : `${actorName} menulis komentar.`,
        href: tripId ? `/trip/${tripId}` : "/notifikasi",
        tripId,
      };
    case "feedback.invite":
      return {
        title: "Trip selesai",
        body: named ? `${named} selesai. Bantu komunitas dengan memberi ulasan.` : "Bantu komunitas dengan memberi ulasan.",
        href: tripId ? `/trip/${tripId}` : "/notifikasi",
        tripId,
      };
    case "trip.invited":
      return {
        title: "Undangan trip",
        body: named ? `Kamu diundang ke ${named}.` : "Kamu diundang ke trip baru.",
        href: invitePath ?? (tripId ? `/trip/${tripId}` : "/notifikasi"),
        tripId,
      };
    case "follower.created":
      return {
        title: "Pengikut baru",
        body: "Seseorang mulai mengikuti profilmu.",
        href: "/notifikasi",
        tripId: null,
      };
    default:
      return {
        title: "Notifikasi Dolan",
        body: "Ada pembaruan untukmu.",
        href: "/notifikasi",
        tripId,
      };
  }
}

function actorLabel(data: Record<string, unknown>): string {
  const username = typeof data.actorUsername === "string" ? data.actorUsername.trim() : "";
  const displayName = typeof data.actorName === "string" ? data.actorName.trim() : "";
  return username || displayName || "Seseorang";
}

function previewText(data: Record<string, unknown>, max = 140): string {
  const raw = typeof data.preview === "string" ? data.preview : "";
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}

function notificationData(raw: Record<string, unknown> | string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return raw;
}

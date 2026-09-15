import { presentInboxNotification } from "@/lib/contracts";

export type InboxNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  tripId: string | null;
  type?: string;
  readAt: string | null;
  createdAt: string;
};

type LiveNotificationRow = {
  id?: string;
  type?: string;
  title?: string;
  body?: string;
  href?: string;
  tripId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt?: string;
};

type NotificationsSuccess =
  | {
      success: true;
      data: LiveNotificationRow[];
      unreadCount?: number;
    }
  | {
      success: true;
      data: { items: LiveNotificationRow[]; unreadCount?: number };
      unreadCount?: number;
    };

function isSuccess(json: unknown): json is NotificationsSuccess {
  return Boolean(json && typeof json === "object" && "success" in json && (json as { success: unknown }).success);
}

export function normalizeInboxNotification(row: LiveNotificationRow): InboxNotification {
  const presented = presentInboxNotification({
    type: row.type ?? "",
    targetType: row.targetType,
    targetId: row.targetId,
    data: row.data,
  });
  const copy = row.type
    ? presented
    : row.title && row.body
      ? {
          title: row.title,
          body: row.body,
          href: row.href ?? (row.tripId ? `/trip/${row.tripId}` : "/notifikasi"),
          tripId: row.tripId ?? presented.tripId,
        }
      : presented;
  return {
    id: String(row.id ?? ""),
    type: row.type,
    title: copy.title,
    body: copy.body,
    href: copy.href,
    tripId: copy.tripId,
    readAt: row.readAt ?? null,
    createdAt: row.createdAt ?? "",
  };
}

export function parseNotificationsResponse(json: unknown): { items: InboxNotification[]; unreadCount: number } {
  if (!isSuccess(json)) return { items: [], unreadCount: 0 };
  const rows = Array.isArray(json.data) ? json.data : (json.data.items ?? []);
  const items = rows.map(normalizeInboxNotification);
  const listedUnread =
    typeof json.unreadCount === "number"
      ? json.unreadCount
      : !Array.isArray(json.data) && typeof json.data.unreadCount === "number"
        ? json.data.unreadCount
        : items.filter((item) => item.readAt === null).length;
  return { items, unreadCount: listedUnread };
}

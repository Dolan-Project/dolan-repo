import type { ChatMessage } from "@/lib/contracts";
import type { TripStatus } from "@dolan/shared";

export type TripRoomBadgeTone = "live" | "soon" | "open" | "done" | "muted";

export function tripRoomStatusBadge(status: TripStatus | undefined): { label: string; tone: TripRoomBadgeTone } {
  if (status === "ONGOING") return { label: "Sedang berjalan", tone: "live" };
  if (status === "OPEN") return { label: "Trip terbuka", tone: "open" };
  if (status === "DRAFT") return { label: "Tahap diskusi", tone: "soon" };
  if (status === "COMPLETED") return { label: "Trip selesai", tone: "done" };
  if (status === "CLOSED") return { label: "Ditutup", tone: "muted" };
  if (status === "CANCELLED") return { label: "Dibatalkan", tone: "muted" };
  return { label: "Trip grup", tone: "muted" };
}

export function tripRoomBadgeClass(tone: TripRoomBadgeTone) {
  if (tone === "live") return "bg-primary/10 text-primary";
  if (tone === "soon") return "bg-secondary-fixed text-on-secondary-fixed";
  if (tone === "open") return "bg-surface-variant text-primary";
  if (tone === "done") return "bg-surface-variant text-on-surface-variant";
  return "bg-surface-variant text-tertiary";
}

export function displayInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function dayKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`;
}

export function messageDayLabel(sentAt: string, now = new Date()) {
  const sent = new Date(sentAt);
  if (Number.isNaN(sent.getTime())) return "";
  if (dayKey(sent) === dayKey(now)) return "Hari ini";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(sent) === dayKey(yesterday)) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(sent);
}

export type ChatDayGroup = { key: string; label: string; messages: ChatMessage[] };

export function groupMessagesByDay(messages: ChatMessage[], now = new Date()): ChatDayGroup[] {
  return messages.reduce<ChatDayGroup[]>((groups, message) => {
    const sent = new Date(message.sentAt);
    const key = Number.isNaN(sent.getTime()) ? "unknown" : dayKey(sent);
    const last = groups.at(-1);
    if (last?.key === key) {
      last.messages.push(message);
      return groups;
    }
    groups.push({ key, label: messageDayLabel(message.sentAt, now), messages: [message] });
    return groups;
  }, []);
}

/**
 * Consecutive messages from one sender read as a single burst, so only the first
 * of a burst repeats the avatar and name.
 */
export function startsNewBurst(previous: ChatMessage | undefined, current: ChatMessage) {
  if (!previous) return true;
  if (previous.sender.id !== current.sender.id) return true;
  const gap = new Date(current.sentAt).getTime() - new Date(previous.sentAt).getTime();
  return !Number.isFinite(gap) || gap > GROUP_WINDOW_MS;
}

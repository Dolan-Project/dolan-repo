"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ApiError, AuthSession } from "@/lib/contracts";
import { parseNotificationsResponse, type InboxNotification } from "@/lib/notifications";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";
import { connectDolanSocket } from "@/lib/realtime/dolan-socket";
import { NotificationFeed } from "@/components/notifications/NotificationFeed";

function shouldSkipUnreadBump(pathname: string, payload: { type?: string; tripId?: string | null }) {
  if (payload.type !== "message.created" || !payload.tripId) return false;
  return pathname === `/trip/${payload.tripId}/chat`;
}

export function NotificationBell({
  session,
  unreadCount = 0,
}: {
  session: AuthSession | null;
  unreadCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;
  const seenRef = useRef(new Set<string>());
  const [liveUnread, setLiveUnread] = useState(unreadCount);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLiveUnread(unreadCount);
  }, [unreadCount]);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/notifications", { credentials: "include" });
      const json = (await response.json()) as unknown;
      const failed =
        !response.ok ||
        (json && typeof json === "object" && "success" in json && (json as { success: boolean }).success === false);
      if (failed) {
        setError(
          json && typeof json === "object" && "error" in json
            ? (json as ApiError).error.message
            : "Gagal memuat notifikasi.",
        );
        setItems([]);
        return;
      }
      const parsed = parseNotificationsResponse(json);
      setError("");
      setItems(parsed.items);
      setLiveUnread(parsed.unreadCount);
      seenRef.current = new Set(parsed.items.filter((item) => item.readAt).map((item) => item.id));
    } catch {
      setError("Gagal memuat notifikasi.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    const socket = connectDolanSocket();
    const onCreated = (payload: {
      type?: string;
      tripId?: string | null;
      title?: string;
      body?: string;
    }) => {
      if (shouldSkipUnreadBump(pathnameRef.current, payload)) return;
      setLiveUnread((count) => count + 1);
      if (openRef.current) void load();
    };
    socket.on("notification.created", onCreated);
    return () => {
      socket.off("notification.created", onCreated);
    };
  }, [session]);

  useEffect(() => {
    if (!open) return;
    void load();
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markSeen(item: InboxNotification) {
    if (!item.id || item.readAt || seenRef.current.has(item.id)) return;
    seenRef.current.add(item.id);
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)),
    );
    setLiveUnread((count) => Math.max(0, count - 1));
    await fetch(`/api/v1/notifications/${item.id}/read`, {
      method: "POST",
      credentials: "include",
    });
  }

  function openItem(item: InboxNotification) {
    setOpen(false);
    void markSeen(item);
    if (item.href && item.href !== "/notifikasi") router.push(item.href);
  }

  if (!session) {
    return (
      <Link
        href={ROUTES.masuk}
        aria-label="Notifikasi"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <Icon name="notifications" className="text-[22px]" />
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={liveUnread > 0 ? `Notifikasi, ${liveUnread} belum dibaca` : "Notifikasi"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="notifications" className="text-[22px]" />
        {liveUnread > 0 ? (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-secondary-container" />
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Notifikasi"
          className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[min(22.5rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_18px_50px_rgba(15,59,94,.16)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-outline-variant/20 px-4 py-3">
            <p className="type-label">Notifikasi</p>
            <p className="type-caption text-on-surface-variant">
              {liveUnread > 0 ? `${liveUnread} belum dibaca` : "Semua terbaca"}
            </p>
          </div>
          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            <NotificationFeed
              items={items}
              loading={loading}
              error={error}
              onSeen={(item) => void markSeen(item)}
              onOpen={openItem}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ApiError } from "@/lib/contracts";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  tripId: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationList() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const response = await fetch("/api/v1/notifications", { credentials: "include" });
    const json = (await response.json()) as
      | { success: true; data: { items: NotificationItem[]; unreadCount: number } }
      | ApiError;
    if (!json.success) {
      setError(json.error.message);
      return;
    }
    setItems(json.data.items);
    setUnreadCount(json.data.unreadCount);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function markRead(id: string) {
    setPending(true);
    await fetch(`/api/v1/notifications/${id}/read`, {
      method: "POST",
      credentials: "include",
    });
    await load();
    setPending(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[720px] px-margin py-6 md:px-margin-desktop md:py-10">
      <p className="type-micro uppercase tracking-wider text-primary">Inbox</p>
      <h1 className="type-title mt-1">Notifikasi</h1>
      <p className="type-caption mt-1 text-on-surface-variant">{unreadCount} belum dibaca</p>
      {error ? (
        <p className="mt-4 type-body text-on-surface">{error}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="card-surface p-4">
              <div className="flex items-start gap-2">
                <Icon name="notifications" className="text-[20px] text-primary" />
                <div>
                  <p className="type-label">{item.title}</p>
                  <p className="type-body text-on-surface-variant">{item.body}</p>
                  {item.readAt === null ? (
                    <button
                      type="button"
                      className="btn-secondary mt-2 !min-h-9 !px-3"
                      disabled={pending}
                      onClick={() => void markRead(item.id)}
                    >
                      Tandai dibaca
                    </button>
                  ) : (
                    <p className="type-caption mt-2 text-on-surface-variant">Sudah dibaca</p>
                  )}
                  {item.tripId ? (
                    <Link href={ROUTES.trip(item.tripId)} className="type-label mt-2 inline-flex text-primary">
                      Buka trip
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

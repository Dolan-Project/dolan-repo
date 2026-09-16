"use client";

import type { InboxNotification } from "@/lib/notifications";

export function NotificationFeed({
  items,
  loading,
  error,
  onOpen,
  onSeen,
}: {
  items: InboxNotification[];
  loading: boolean;
  error: string;
  onOpen: (item: InboxNotification) => void;
  onSeen?: (item: InboxNotification) => void;
}) {
  if (loading) {
    return <p className="px-4 py-5 type-caption text-on-surface-variant">Memuat notifikasi…</p>;
  }
  if (error) {
    return <p className="px-4 py-5 type-body text-on-surface">{error}</p>;
  }
  if (items.length === 0) {
    return <p className="px-4 py-5 type-caption text-on-surface-variant">Belum ada notifikasi.</p>;
  }

  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.id} className="border-b border-outline-variant/25 last:border-b-0">
          <button
            type="button"
            className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-surface-container-low ${
              item.readAt ? "" : "bg-primary-fixed/25"
            }`}
            onPointerEnter={() => onSeen?.(item)}
            onFocus={() => onSeen?.(item)}
            onClick={() => onOpen(item)}
          >
            <p className="type-label text-on-surface">{item.title}</p>
            <p className="type-caption line-clamp-2 text-on-surface-variant">{item.body}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}

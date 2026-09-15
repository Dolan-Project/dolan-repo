"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ApiError } from "@/lib/contracts";
import { parseNotificationsResponse, type InboxNotification } from "@/lib/notifications";
import { NotificationFeed } from "@/components/notifications/NotificationFeed";

export function NotificationList() {
  const router = useRouter();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const seenRef = useRef(new Set<string>());

  async function load() {
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
      seenRef.current = new Set(parsed.items.filter((item) => item.readAt).map((item) => item.id));
    } catch {
      setError("Gagal memuat notifikasi.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markSeen(item: InboxNotification) {
    if (!item.id || item.readAt || seenRef.current.has(item.id)) return;
    seenRef.current.add(item.id);
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)),
    );
    await fetch(`/api/v1/notifications/${item.id}/read`, {
      method: "POST",
      credentials: "include",
    });
  }

  function openItem(item: InboxNotification) {
    void markSeen(item);
    if (item.href && item.href !== "/notifikasi") router.push(item.href);
  }

  return (
    <div className="card-surface overflow-hidden">
      <NotificationFeed
        items={items}
        loading={loading}
        error={error}
        onSeen={(item) => void markSeen(item)}
        onOpen={openItem}
      />
    </div>
  );
}

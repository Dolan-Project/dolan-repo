"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthSession } from "@/lib/contracts";
import { connectDolanSocket } from "@/lib/realtime/dolan-socket";

function shouldSkipToast(pathname: string, payload: { type?: string; tripId?: string | null }) {
  if (payload.type !== "message.created" || !payload.tripId) return false;
  return pathname === `/trip/${payload.tripId}/chat`;
}

function showOsNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const notification = new Notification(title, { body, tag: "dolan-push" });
    window.setTimeout(() => notification.close(), 6000);
  } catch {
    /* Chrome may block while the tab is focused */
  }
}

export function NotificationToaster({ session }: { session: AuthSession | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [toast, setToast] = useState<{ title: string; body: string; href: string } | null>(null);

  useEffect(() => {
    if (!session) return;
    const socket = connectDolanSocket();
    const onCreated = (payload: {
      type?: string;
      tripId?: string | null;
      title?: string;
      body?: string;
      href?: string;
    }) => {
      if (shouldSkipToast(pathname, payload)) return;
      const title = payload.title?.trim() || "Dolan";
      const body = payload.body?.trim() || "Ada pembaruan untukmu.";
      const href = payload.href || (payload.tripId ? `/trip/${payload.tripId}` : "/notifikasi");
      setToast({ title, body, href });
      showOsNotification(title, body);
    };
    socket.on("notification.created", onCreated);
    return () => {
      socket.off("notification.created", onCreated);
    };
  }, [session, pathname]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <button
      type="button"
      className="fixed right-4 bottom-24 z-[120] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/70 bg-white/95 p-4 text-left shadow-[0_18px_50px_rgba(15,59,94,.18)] backdrop-blur-xl md:bottom-6"
      onClick={() => {
        setToast(null);
        if (toast.href !== "/notifikasi") router.push(toast.href);
      }}
    >
      <p className="type-caption uppercase tracking-wider text-primary">Notifikasi</p>
      <p className="type-label mt-1 text-on-surface">{toast.title}</p>
      <p className="type-caption mt-0.5 line-clamp-2 text-on-surface-variant">{toast.body}</p>
    </button>
  );
}

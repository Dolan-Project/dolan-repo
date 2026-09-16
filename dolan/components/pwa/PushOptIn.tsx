"use client";

import { useEffect, useState } from "react";
import { syncPushSubscription } from "@/lib/pwa/sync-push-subscription";

/** Registers Web Push subscription when VAPID public key is present. */
export function PushOptIn() {
  const [status, setStatus] = useState<"idle" | "ok" | "denied" | "unsupported">("idle");

  useEffect(() => {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    void (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus("denied");
          return;
        }
        const ok = await syncPushSubscription();
        setStatus(ok ? "ok" : "denied");
      } catch {
        setStatus("denied");
      }
    })();
  }, []);

  if (status === "unsupported" || status === "idle") return null;
  return (
    <p className="type-caption text-on-surface-variant">
      {status === "ok"
        ? "Notifikasi push diaktifkan untuk perangkat ini."
        : "Izin notifikasi ditolak — kamu tetap bisa baca notifikasi di dalam aplikasi."}
    </p>
  );
}

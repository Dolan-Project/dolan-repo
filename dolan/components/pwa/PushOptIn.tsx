"use client";

import { useEffect, useState } from "react";

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
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid),
          }));
        const json = subscription.toJSON();
        await fetch("/api/v1/push/subscriptions", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          }),
        });
        setStatus("ok");
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

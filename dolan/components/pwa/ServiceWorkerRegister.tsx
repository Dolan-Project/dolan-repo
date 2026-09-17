"use client";

import { useEffect } from "react";
import { syncPushSubscription } from "@/lib/pwa/sync-push-subscription";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").then(() => {
      void syncPushSubscription();
    });
  }, []);
  return null;
}

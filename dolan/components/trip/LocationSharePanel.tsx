"use client";

import { useEffect, useRef, useState } from "react";

type Duration = "ONE_HOUR" | "UNTIL_TRIP_END";
type ShareStatus = "active" | "stale" | "stopped";

type MemberLocation = {
  userId: string;
  shareId: string;
  scope: string;
  latitude: number;
  longitude: number;
  freshness: "LIVE" | "STALE";
};

type ActiveShare = {
  id: string;
  expiresAt: string | null;
};

type LocationSharePanelProps = {
  tripId: string;
};

async function readJson<T>(response: Response): Promise<
  | { success: true; data: T }
  | { success: false; error?: { message?: string } }
> {
  return (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };
}

export function LocationSharePanel({ tripId }: LocationSharePanelProps) {
  const [duration, setDuration] = useState<Duration>("ONE_HOUR");
  const [status, setStatus] = useState<ShareStatus>("stopped");
  const [activeShare, setActiveShare] = useState<ActiveShare | null>(null);
  const [members, setMembers] = useState<MemberLocation[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const watchRef = useRef<number | null>(null);
  const shareIdRef = useRef<string | null>(null);

  function clearWatch() {
    if (watchRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }

  async function refreshLocations() {
    const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/locations`, {
      credentials: "include",
    });
    const json = await readJson<{ locations: MemberLocation[] }>(response);
    if (!json.success) return;
    const list = json.data.locations ?? [];
    setMembers(list);
    const mine = shareIdRef.current
      ? list.find((row) => row.shareId === shareIdRef.current)
      : undefined;
    if (mine) {
      setStatus(mine.freshness === "STALE" ? "stale" : "active");
    } else if (shareIdRef.current) {
      setStatus("stale");
    }
  }

  function startWatch() {
    if (!navigator.geolocation) {
      setError("Browser ini belum mendukung lokasi perangkat.");
      return;
    }
    clearWatch();
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        void fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/location/ping`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy || null,
          }),
        }).then(() => refreshLocations()).catch(() => undefined);
      },
      () => setError("Lokasi tidak dapat diakses. Periksa izin browser."),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 12_000 },
    );
  }

  async function onStart() {
    setPending(true);
    setError("");
    const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/location/start`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ duration, scope: "TRIP_PRECISE" }),
    });
    const json = await readJson<ActiveShare & { id: string; expiresAt: string }>(response);
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Gagal memulai berbagi lokasi");
      return;
    }
    shareIdRef.current = json.data.id;
    setActiveShare({ id: json.data.id, expiresAt: json.data.expiresAt });
    setStatus("active");
    startWatch();
    await refreshLocations();
  }

  async function onStop() {
    setPending(true);
    setError("");
    clearWatch();
    const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/location/stop`, {
      method: "POST",
      credentials: "include",
    });
    const json = await readJson<{ stopped: boolean }>(response);
    setPending(false);
    shareIdRef.current = null;
    setActiveShare(null);
    setStatus("stopped");
    if (!json.success) {
      setError(json.error?.message ?? "Gagal menghentikan berbagi lokasi");
      return;
    }
    await refreshLocations();
  }

  useEffect(() => {
    void refreshLocations();
    const timer = window.setInterval(() => {
      void refreshLocations();
    }, 30_000);
    return () => {
      window.clearInterval(timer);
      clearWatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const statusLabel =
    status === "active" ? "Aktif" : status === "stale" ? "Stale" : "Berhenti";

  return (
    <section className="card-surface p-5">
      <p className="type-micro uppercase text-secondary">Lokasi live</p>
      <h2 className="type-subtitle mt-1">Bagikan lokasi</h2>
      <p className="type-caption mt-1 text-on-surface-variant">
        Opt-in untuk host dan peserta yang sudah diterima. Pending tidak melihat lokasi presisi.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="type-label text-on-surface">Status:</span>
        <span
          className={`rounded-full px-3 py-1 type-caption font-bold ${
            status === "active"
              ? "bg-emerald-100 text-emerald-800"
              : status === "stale"
                ? "bg-amber-100 text-amber-800"
                : "bg-surface-container text-on-surface-variant"
          }`}
        >
          {statusLabel}
        </span>
        {activeShare?.expiresAt ? (
          <span className="type-caption text-on-surface-variant">
            sampai{" "}
            {new Intl.DateTimeFormat("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(activeShare.expiresAt))}
          </span>
        ) : null}
      </div>

      {status === "stopped" ? (
        <div className="mt-4 space-y-3">
          <fieldset className="space-y-2">
            <legend className="type-label text-on-surface">Durasi</legend>
            <label className="flex items-center gap-2 type-caption text-on-surface-variant">
              <input
                type="radio"
                name={`location-duration-${tripId}`}
                checked={duration === "ONE_HOUR"}
                onChange={() => setDuration("ONE_HOUR")}
              />
              1 jam
            </label>
            <label className="flex items-center gap-2 type-caption text-on-surface-variant">
              <input
                type="radio"
                name={`location-duration-${tripId}`}
                checked={duration === "UNTIL_TRIP_END"}
                onChange={() => setDuration("UNTIL_TRIP_END")}
              />
              Sampai trip selesai
            </label>
          </fieldset>
          <button type="button" className="btn-primary" disabled={pending} onClick={() => void onStart()}>
            {pending ? "Memulai…" : "Mulai bagikan lokasi"}
          </button>
        </div>
      ) : (
        <button type="button" className="btn-secondary mt-4" disabled={pending} onClick={() => void onStop()}>
          {pending ? "Menghentikan…" : "Stop berbagi"}
        </button>
      )}

      {members.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {members.map((member) => (
            <li key={member.shareId} className="rounded-xl bg-surface-container-low px-3 py-2 type-caption text-on-surface-variant">
              <span className="type-label text-on-surface">{member.userId.slice(0, 8)}…</span>
              {" · "}
              {member.freshness === "LIVE" ? "live" : "stale"}
              {" · "}
              {member.latitude.toFixed(4)}, {member.longitude.toFixed(4)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 type-caption text-on-surface-variant">Belum ada anggota yang membagikan lokasi.</p>
      )}

      {error ? (
        <p className="mt-3 rounded-xl bg-error-container px-3 py-2 type-caption text-on-error-container" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

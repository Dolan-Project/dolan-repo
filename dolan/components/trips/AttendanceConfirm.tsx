"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type ReviewPeer = { username: string; label: string };

type AttendanceConfirmProps = {
  tripId: string;
  tripTitle?: string;
  reviewUsername?: string | null;
  /** When host, can mark a participant's attendance. */
  isHost?: boolean;
  participantUserId?: string | null;
  participantLabel?: string | null;
};

export function AttendanceConfirm({
  tripId,
  tripTitle,
  reviewUsername = null,
  isHost = false,
  participantUserId = null,
  participantLabel = null,
}: AttendanceConfirmProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [disputed, setDisputed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [markPresent, setMarkPresent] = useState(true);
  const [peers, setPeers] = useState<ReviewPeer[]>(
    reviewUsername ? [{ username: reviewUsername, label: reviewUsername }] : [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const [tripResponse, meResponse, attendanceResponse] = await Promise.all([
        fetch(`/api/v1/trips/${encodeURIComponent(tripId)}`, { credentials: "include", signal: controller.signal }),
        fetch("/api/v1/users/me", { credentials: "include", signal: controller.signal }),
        fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/attendance`, {
          credentials: "include",
          signal: controller.signal,
        }),
      ]);
      if (attendanceResponse.ok) {
        const attendanceJson = (await attendanceResponse.json()) as {
          success?: boolean;
          data?: { confirmed?: boolean; disputed?: boolean; selfAttendance?: string };
        };
        if (attendanceJson.success) {
          const selfAttendance = attendanceJson.data?.selfAttendance ?? "UNCONFIRMED";
          setConfirmed(Boolean(attendanceJson.data?.confirmed) || selfAttendance !== "UNCONFIRMED");
          setDisputed(Boolean(attendanceJson.data?.disputed) || selfAttendance === "DISPUTED");
        }
      }
      if (!tripResponse.ok) return;
      const tripJson = (await tripResponse.json()) as {
        success?: boolean;
        data?: { members?: Array<{ id: string; username: string; displayName: string }>; host?: { id: string; username: string; displayName: string } };
      };
      const meJson = meResponse.ok
        ? ((await meResponse.json()) as { success?: boolean; data?: { user?: { id?: string } } })
        : null;
      if (controller.signal.aborted || !tripJson.success) return;
      const meId = meJson?.data?.user?.id ?? null;
      const roster = tripJson.data?.members?.length ? tripJson.data.members : tripJson.data?.host ? [tripJson.data.host] : [];
      const others = roster.filter((member) => member.username && member.id !== meId);
      if (others.length > 0) {
        setPeers(others.map((member) => ({ username: member.username, label: member.displayName || member.username })));
      }
    })()
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setStatusLoaded(true);
      });
    return () => controller.abort();
  }, [tripId]);

  async function submit(body: { confirmed: boolean; targetUserId?: string }) {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/v1/trips/${encodeURIComponent(tripId)}/attendance`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as {
      success: boolean;
      data?: { confirmed: boolean; disputed?: boolean };
      error?: { message: string };
    };
    setPending(false);
    if (!json.success) {
      setMessage(json.error?.message ?? "Konfirmasi gagal");
      return;
    }
    setConfirmed(Boolean(json.data?.confirmed) || (!body.targetUserId && body.confirmed));
    setDisputed(Boolean(json.data?.disputed));
    setMessage(
      json.data?.disputed
        ? "Kehadiran disputed — host dan peserta tidak selaras. Review ditunda sampai diselesaikan."
        : "Kehadiran pada trip selesai sudah dicatat.",
    );
  }

  const reviewPeers = peers.filter((peer) => peer.username.length > 0);

  return (
    <section className="card-surface mt-3 p-4 md:p-5">
      <h2 className="type-subtitle text-on-surface">Konfirmasi kehadiran</h2>
      <p className="type-body mt-1 text-on-surface-variant">
        {tripTitle ? `${tripTitle}. ` : ""}
        Setelah trip selesai, host menandai kehadiran peserta dan peserta mengonfirmasi sendiri. Review
        terbuka 30 hari setelah trip selesai, hanya jika keduanya Present (bukan disputed).
      </p>
      <button
        type="button"
        className="btn-primary mt-3 !min-h-11"
        disabled={pending || confirmed || !statusLoaded}
        onClick={() => void submit({ confirmed: true })}
      >
        {confirmed ? "Sudah konfirmasi diri" : pending ? "Memproses…" : "Konfirmasi kehadiran saya"}
      </button>
      {isHost && participantUserId ? (
        <div className="mt-4 space-y-2 border-t border-outline-variant/40 pt-3">
          <p className="type-label text-on-surface">
            Tandai kehadiran {participantLabel ?? "peserta"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn-ghost !min-h-11 ${markPresent ? "ring-2 ring-primary" : ""}`}
              onClick={() => setMarkPresent(true)}
            >
              Hadir
            </button>
            <button
              type="button"
              className={`btn-ghost !min-h-11 ${!markPresent ? "ring-2 ring-primary" : ""}`}
              onClick={() => setMarkPresent(false)}
            >
              Tidak hadir
            </button>
            <button
              type="button"
              className="btn-primary !min-h-11"
              disabled={pending}
              onClick={() =>
                void submit({ confirmed: markPresent, targetUserId: participantUserId })
              }
            >
              Simpan tanda host
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p className={`type-caption mt-2 ${disputed ? "text-error" : "text-on-surface-variant"}`}>
          {message}
        </p>
      ) : null}
      {confirmed && !disputed && reviewPeers.length > 0 ? (
        <div className="mt-3 space-y-1">
          <p className="type-caption font-semibold text-on-surface">Beri rating rekan trip</p>
          {reviewPeers.map((peer) => (
            <Link
              key={peer.username}
              href={`${ROUTES.profilUlasan(peer.username)}?tripId=${encodeURIComponent(tripId)}`}
              className="flex min-h-11 items-center type-label font-semibold text-primary"
            >
              Tulis ulasan untuk {peer.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ApiError,
  JoinRequest,
  TripComment,
  TripDetail,
} from "@/lib/contracts";
import { ROUTES } from "@/lib/routes";

type TripExperienceProps = {
  tripId: string;
  isLoggedIn: boolean;
  hideHero?: boolean;
};

type Json<T> = { success: true; data: T } | ApiError;

async function readJson<T>(response: Response): Promise<Json<T>> {
  return (await response.json()) as Json<T>;
}

export function TripExperience({
  tripId,
  isLoggedIn,
  hideHero = false,
}: TripExperienceProps) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [comments, setComments] = useState<TripComment[]>([]);
  const [queue, setQueue] = useState<JoinRequest[]>([]);
  const [error, setError] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function loadAll() {
    const tripRes = await readJson<TripDetail>(
      await fetch(`/api/v1/trips/${tripId}`, { credentials: "include" }),
    );
    if (!tripRes.success) {
      setError(tripRes.error.message);
      return;
    }
    setTrip(tripRes.data);
    const commentRes = await readJson<TripComment[]>(
      await fetch(`/api/v1/trips/${tripId}/comments`, { credentials: "include" }),
    );
    if (commentRes.success) setComments(commentRes.data);

    if (tripRes.data.viewerRole === "host") {
      const queueRes = await readJson<JoinRequest[]>(
        await fetch(`/api/v1/trips/${tripId}/join-requests`, { credentials: "include" }),
      );
      if (queueRes.success) setQueue(queueRes.data);
    }

  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when trip changes
  }, [tripId]);


  const threads = useMemo(() => {
    const roots = comments.filter((row) => row.parentId === null);
    return roots.map((root) => ({
      root,
      replies: comments.filter((row) => row.parentId === root.id),
    }));
  }, [comments]);

  async function onComment(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await readJson<TripComment>(
      await fetch(`/api/v1/trips/${tripId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          body: commentBody,
          parentId: replyTo ?? undefined,
        }),
      }),
    );
    setPending(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setCommentBody("");
    setReplyTo(null);
    await loadAll();
  }

  async function onJoin(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await readJson<JoinRequest>(
      await fetch(`/api/v1/trips/${tripId}/join-requests`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ message: joinMessage || undefined }),
      }),
    );
    setPending(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setJoinMessage("");
    await loadAll();
  }

  async function onWithdraw() {
    if (!trip?.myJoinRequest) return;
    setPending(true);
    await fetch(`/api/v1/join-requests/${trip.myJoinRequest.id}/withdraw`, {
      method: "POST",
      credentials: "include",
    });
    setPending(false);
    await loadAll();
  }


  async function onReview(requestId: string, decision: "accept" | "reject") {
    setPending(true);
    await fetch(`/api/v1/join-requests/${requestId}/review`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ decision }),
    });
    setPending(false);
    await loadAll();
  }

  if (!trip) {
    if (hideHero) {
      return error ? (
        <p className="type-body text-error" role="alert">
          {error}
        </p>
      ) : null;
    }
    return <p className="type-body text-on-surface-variant">{error || "Memuat trip…"}</p>;
  }

  const joinStatus =
    trip.myJoinRequest?.status === "WITHDRAWN" ? undefined : trip.myJoinRequest?.status;
  const joinCta = !isLoggedIn
    ? "login"
    : trip.viewerRole === "host"
        ? "host"
        : trip.viewerRole === "participant"
          ? "member"
          : joinStatus ?? "none";

  return (
    <div className={hideHero ? "flex flex-col gap-6" : "mx-auto flex max-w-[960px] flex-col gap-6 px-margin py-6 md:px-margin-desktop md:py-10"}>
      {hideHero ? null : (
      <div>
        <p className="type-micro uppercase tracking-wider text-primary">Trip publik</p>
        <h1 className="type-title mt-1 text-on-surface">{trip.title}</h1>
        <p className="type-body mt-2 text-on-surface-variant">{trip.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip bg-secondary-fixed text-on-secondary-container">Join gratis</span>
          <span className="chip bg-surface-container text-on-surface-variant">
            {trip.destinationCity}
          </span>
          <span className="chip bg-surface-container text-on-surface-variant">
            Host @{trip.host.username}
          </span>
        </div>
      </div>
      )}

      {error ? (
        <p className="rounded-xl bg-error-container px-4 py-3 type-body text-on-error-container">
          {error}
        </p>
      ) : null}

      <section className="card-surface p-4 md:p-5">
        <h2 className="type-subtitle">Ajukan join</h2>
        <p className="type-caption mt-1 text-on-surface-variant">
          Tidak ada booking, checkout, deposit, atau pembayaran ke host. Setiap orang menanggung
          biaya perjalanannya sendiri.
        </p>
        {joinCta === "login" ? (
          <Link
            href={`${ROUTES.masuk}?next=${encodeURIComponent(ROUTES.trip(tripId))}`}
            className="btn-primary mt-4"
          >
            Masuk untuk Ajukan join
          </Link>
        ) : null}
        {joinCta === "none" ? (
          <form className="mt-4 flex flex-col gap-3" onSubmit={onJoin}>
            <textarea
              className="field-input min-h-24"
              placeholder="Pesan singkat ke host (opsional)"
              value={joinMessage}
              onChange={(event) => setJoinMessage(event.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={pending}>
              Ajukan join
            </button>
          </form>
        ) : null}
        {joinCta === "PENDING" ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="type-body">Pengajuan kamu sedang ditinjau host.</p>
            <button type="button" className="btn-secondary" onClick={() => void onWithdraw()} disabled={pending}>
              Tarik pengajuan
            </button>
          </div>
        ) : null}
        {joinCta === "REJECTED" ? (
          <p className="type-body mt-3">Host menolak pengajuan kamu.</p>
        ) : null}
        {joinCta === "ACCEPTED" || joinCta === "member" ? (
          <p className="type-body mt-3">Kamu sudah jadi peserta trip ini.</p>
        ) : null}
        {joinCta === "host" ? (
          <p className="type-body mt-3">Kamu host trip ini.</p>
        ) : null}
      </section>

      {trip.viewerRole === "host" ? (
        <section className="card-surface p-4 md:p-5">
          <h2 className="type-subtitle">Pengajuan masuk</h2>
          {queue.length === 0 ? (
            <p className="type-body mt-2 text-on-surface-variant">Belum ada pengajuan.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {queue.map((row) => (
                <li key={row.id} className="rounded-xl bg-surface-container-low p-3">
                  <Link href={ROUTES.profil + "/" + row.applicant.username} className="type-label text-primary">
                    @{row.applicant.username}
                  </Link>
                  <p className="type-body">{row.applicant.displayName}</p>
                  <p className="type-caption text-on-surface-variant">{row.message || "Tanpa pesan"}</p>
                  <p className="type-micro mt-1 uppercase">{row.status}</p>
                  {row.status === "PENDING" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary !min-h-10"
                        disabled={pending}
                        onClick={() => void onReview(row.id, "accept")}
                      >
                        Terima
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !min-h-10"
                        disabled={pending}
                        onClick={() => void onReview(row.id, "reject")}
                      >
                        Tolak
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="card-surface p-4 md:p-5">
        <h2 className="type-subtitle">Diskusi publik</h2>
        <p className="type-caption mt-1 text-on-surface-variant">
          Tamu boleh membaca. Menulis butuh akun terverifikasi. Pending join tetap boleh berkomentar.
        </p>
        <ul className="mt-4 flex flex-col gap-4">
          {threads.map(({ root, replies }) => (
            <li key={root.id}>
              <p className="type-label">@{root.author.username}</p>
              <p className="type-body">{root.body}</p>
              <button
                type="button"
                className="type-micro mt-1 text-primary"
                onClick={() => setReplyTo(root.id)}
              >
                Balas
              </button>
              {replies.map((reply) => (
                <div key={reply.id} className="mt-2 ml-4 border-l border-outline-variant/40 pl-3">
                  <p className="type-label">@{reply.author.username}</p>
                  <p className="type-body">{reply.body}</p>
                </div>
              ))}
            </li>
          ))}
        </ul>
        {isLoggedIn ? (
          <form className="mt-4 flex flex-col gap-3" onSubmit={onComment}>
            {replyTo ? (
              <p className="type-caption">
                Membalas satu tingkat.{" "}
                <button type="button" className="text-primary" onClick={() => setReplyTo(null)}>
                  Batal
                </button>
              </p>
            ) : null}
            <textarea
              className="field-input min-h-24"
              required
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="Tulis komentar…"
            />
            <button type="submit" className="btn-primary" disabled={pending}>
              Kirim komentar
            </button>
          </form>
        ) : (
          <p className="type-body mt-4">Masuk untuk menulis komentar.</p>
        )}
      </section>
    </div>
  );
}

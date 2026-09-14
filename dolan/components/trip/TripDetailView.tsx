"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { AttendanceConfirm } from "@/components/trips/AttendanceConfirm";
import { ReportTargetButton } from "@/components/moderation/ReportTargetButton";
import type { ApiError, JoinRequest, TripComment, TripDetail } from "@/lib/contracts";
import { ROUTES, tripEditHref, tripItineraryPath } from "@/lib/routes";
import type { EditableItineraryDay } from "@dolan/shared";
import { ItineraryPdfButton } from "./ItineraryPdfButton";
import { LocationSharePanel } from "./LocationSharePanel";
import { ShareLinkPanel } from "./ShareLinkPanel";
import { TripBoardMap, type TripMapMarker } from "./TripBoardMap";

type Json<T> = { success: true; data: T } | ApiError;

async function readJson<T>(response: Response): Promise<Json<T>> {
  return (await response.json()) as Json<T>;
}

function roleLabel(role: TripDetail["viewerRole"]) {
  if (role === "host") return "Host";
  if (role === "participant") return "Peserta";
  if (role === "pending") return "Pengajuan";
  return "Trip publik";
}

function dateLabel(start: string | null, end: string | null) {
  if (!start && !end) return "Tanggal fleksibel";
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const format = (value: string) => formatter.format(new Date(`${value}T00:00:00`));
  if (!start) return format(end!);
  if (!end || start === end) return format(start);
  return `${format(start)} – ${format(end)}`;
}

export function TripDetailView({
  tripId,
  isLoggedIn,
  emailVerified,
}: {
  tripId: string;
  isLoggedIn: boolean;
  emailVerified: boolean;
}) {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [comments, setComments] = useState<TripComment[]>([]);
  const [queue, setQueue] = useState<JoinRequest[]>([]);
  const [days, setDays] = useState<EditableItineraryDay[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState("");
  const [routeMarkers, setRouteMarkers] = useState<TripMapMarker[]>([]);
  const [templateMessage, setTemplateMessage] = useState("");
  const [navPending, setNavPending] = useState(false);

  async function loadAll() {
    const tripRes = await readJson<TripDetail>(await fetch(`/api/v1/trips/${tripId}`, { credentials: "include" }));
    if (!tripRes.success) {
      setError(tripRes.error.message);
      setTrip(null);
      return;
    }
    setError("");
    setTrip(tripRes.data);
    const [commentRes, itineraryRes, routeRes] = await Promise.all([
      readJson<TripComment[] | { items?: TripComment[] }>(await fetch(`/api/v1/trips/${tripId}/comments`, { credentials: "include" })),
      fetch(`/api/v1/trips/${tripId}/itinerary`, { credentials: "include" }).then((response) => response.json()).catch(() => null),
      fetch(`/api/v1/trips/${tripId}/route-map`, { credentials: "include" }).then((response) => response.ok ? response.json() : null).catch(() => null),
    ]);
    if (commentRes.success) {
      setComments(Array.isArray(commentRes.data) ? commentRes.data : commentRes.data.items ?? []);
    }
    const itineraryDays = (itineraryRes as { success?: boolean; data?: { versions?: Array<{ id: string; days: EditableItineraryDay[] }>; activeVersionId?: string } } | null)?.data;
    const active = itineraryDays?.versions?.find((version) => version.id === itineraryDays.activeVersionId) ?? itineraryDays?.versions?.[0];
    setDays(active?.days ?? []);
    const points = (routeRes as { success?: boolean; data?: { points?: Array<{ id: string; label: string; lat: number; lng: number }> } } | null)?.data?.points ?? [];
    setRouteMarkers(points.map((point, index) => ({ id: point.id, label: point.label, latitude: point.lat, longitude: point.lng, selected: index === 0 })));
    if (tripRes.data.viewerRole === "host") {
      const queueRes = await readJson<JoinRequest[] | { items?: JoinRequest[] }>(await fetch(`/api/v1/trips/${tripId}/join-requests`, { credentials: "include" }));
      if (queueRes.success) setQueue(Array.isArray(queueRes.data) ? queueRes.data : queueRes.data.items ?? []);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const threads = useMemo(() => {
    const roots = comments.filter((row) => row.parentId === null);
    return roots.map((root) => ({ root, replies: comments.filter((row) => row.parentId === root.id) }));
  }, [comments]);

  async function openNavigation(dayNumber?: number) {
    if (navPending) return;
    setNavPending(true);
    setError("");
    try {
      const query = dayNumber ? `?day=${dayNumber}` : "";
      const response = await fetch(`/api/v1/trips/${tripId}/navigation${query}`, {
        credentials: "include",
      });
      const json = (await response.json()) as
        | { success: true; data: { url?: string; mapsUrl?: string } }
        | ApiError;
      if (!json.success) {
        setError(json.error.message);
        return;
      }
      const url = json.data.url ?? json.data.mapsUrl;
      if (!url) {
        setError("Tautan navigasi belum tersedia untuk itinerary ini.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Gagal membuka navigasi Google Maps.");
    } finally {
      setNavPending(false);
    }
  }

  async function act(path: string, body: unknown) {
    setPending(true);
    setTemplateMessage("");
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as {
      success: boolean;
      error?: { message: string };
      data?: { templateId?: string; title?: string };
    };
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Aksi gagal");
      return;
    }
    if (path.endsWith("/publish-as-template")) {
      setTemplateMessage(
        json.data?.templateId
          ? `Template "${json.data.title ?? trip?.title ?? "Trip"}" dipublikasikan.`
          : "Trip dipublikasikan sebagai template.",
      );
      return;
    }
    if (path.endsWith("/leave")) {
      router.push(ROUTES.tripSaya);
      router.refresh();
      return;
    }
    await loadAll();
  }

  async function onComment(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await readJson<TripComment>(await fetch(`/api/v1/trips/${tripId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: commentBody, parentId: replyTo ?? undefined }),
    }));
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
    const response = await readJson<JoinRequest>(await fetch(`/api/v1/trips/${tripId}/join-requests`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: joinMessage || undefined }),
    }));
    setPending(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setJoinMessage("");
    await loadAll();
  }

  if (!trip && !error) {
    return <p className="px-margin py-10 type-body text-on-surface-variant">Memuat trip…</p>;
  }
  if (!trip) {
    return <p className="px-margin py-10 type-body text-error" role="alert">{error}</p>;
  }

  const visitor = trip.viewerRole === "none" || trip.viewerRole === "visitor";
  const budget = Number(trip.budgetAmount ?? 0);
  const perPerson = trip.budgetBasis === "PER_PERSON" ? budget : Math.round(budget / Math.max(trip.planningPartySize, 1));
  const meetingLabel = trip.meetingPoint ?? trip.publicMeetingPointLabel;
  const markers: TripMapMarker[] = routeMarkers.length > 1
    ? routeMarkers
    : trip.publicMeetingPointLatitude != null && trip.publicMeetingPointLongitude != null
      ? [{ id: "meeting", label: meetingLabel ?? "Titik temu", latitude: trip.publicMeetingPointLatitude, longitude: trip.publicMeetingPointLongitude, selected: true }]
      : [];
  const joinStatus = trip.myJoinRequest?.status === "WITHDRAWN" ? undefined : trip.myJoinRequest?.status;
  const joinCta = !isLoggedIn ? "login" : !emailVerified ? "unverified" : trip.viewerRole === "host" ? "host" : trip.viewerRole === "participant" ? "member" : joinStatus ?? "none";
  const members = trip.members ?? [trip.host];
  const genderLabel = trip.genderRule === "FEMALE_ONLY" ? "Khusus perempuan" : trip.genderRule === "MALE_ONLY" ? "Khusus laki-laki" : "Semua gender";

  return (
    <main className="bg-surface pb-16">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#071c32] via-[#0d3b66] to-primary px-margin py-10 text-white md:px-margin-desktop md:py-16">
        <p className="type-micro uppercase tracking-[.18em] text-white/70">{roleLabel(trip.viewerRole)} · Join gratis</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">{trip.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">{trip.description || "Rencana perjalanan terbuka untuk traveler yang ingin berbagi rute, bukan membeli paket."}</p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
          <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur"><Icon name="location_on" /> {trip.destinationCity || "Tujuan belum dipilih"}</span>
          <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur"><Icon name="calendar_month" /> {dateLabel(trip.startDate, trip.endDate)}</span>
          <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur"><Icon name="group" /> {trip.activeParticipantCount}{trip.maxParticipants ? `/${trip.maxParticipants}` : ""} traveler</span>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-margin py-8 md:px-margin-desktop lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <div className="space-y-6">
          <section className="card-surface flex flex-wrap items-center gap-4 p-5">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-primary text-lg font-extrabold text-white">
              {trip.host.avatarUrl ? <img src={trip.host.avatarUrl} alt="" className="h-full w-full object-cover" /> : trip.host.displayName.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="type-micro uppercase text-secondary">Host trip</p>
              <Link href={ROUTES.profilUser(trip.host.username)} className="type-subtitle text-on-surface hover:text-primary">{trip.host.displayName}</Link>
              <p className="type-caption text-on-surface-variant">@{trip.host.username}</p>
            </div>
            <span className="chip bg-secondary-fixed text-on-secondary-container">Join gratis</span>
          </section>

          {meetingLabel ? <p className="type-body text-on-surface-variant">Titik temu: <strong className="text-on-surface">{meetingLabel}</strong></p> : null}
          <p className="type-caption text-on-surface-variant">Estimasi ± Rp {perPerson.toLocaleString("id-ID")} / orang (bukan tarif join). Rencana {trip.planningPartySize} orang{trip.maxParticipants ? ` · kapasitas ${trip.maxParticipants}` : ""}.</p>
          {trip.visibility === "PUBLIC" ? <div className="rounded-2xl bg-surface-container-low p-4"><p className="type-label text-on-surface">Aturan peserta</p><p className="type-caption mt-1 text-on-surface-variant">{genderLabel}</p>{trip.communityRules ? <p className="type-body mt-2 whitespace-pre-line text-on-surface">{trip.communityRules}</p> : null}</div> : null}

          {days.length > 0 ? (
            <section className="card-surface p-5">
              <p className="type-micro uppercase text-secondary">Rute perjalanan</p>
              <h2 className="type-subtitle mt-1">Itinerary {days.length} hari</h2>
              <ol className="mt-4 space-y-4">
                {days.map((day) => (
                  <li key={day.id} className="rounded-2xl bg-surface-container-low p-4">
                    <p className="type-label text-primary">Hari {day.dayNumber} · {day.title || day.date}</p>
                    <ul className="mt-2 space-y-1 type-caption text-on-surface-variant">
                      {day.stops.map((stop) => <li key={stop.id}>{stop.startTime ? `${stop.startTime} · ` : ""}{stop.place?.name ?? stop.customTitle}</li>)}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="card-surface p-5">
            <h2 className="type-subtitle">Traveler yang join</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-3">
                  <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-primary text-sm font-extrabold text-white">
                    {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" /> : member.displayName.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <Link href={ROUTES.profilUser(member.username)} className="type-label text-on-surface hover:text-primary">{member.displayName}</Link>
                    <p className="type-caption text-on-surface-variant">@{member.username}{member.id === trip.host.id ? " · Host" : ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {trip.viewerRole === "host" ? (
            <section id="join-requests" className="card-surface p-5">
              <h2 className="type-subtitle">Pengajuan masuk</h2>
              {queue.length === 0 ? <p className="type-body mt-2 text-on-surface-variant">Belum ada pengajuan.</p> : (
                <ul className="mt-3 flex flex-col gap-3">
                  {queue.map((row) => (
                    <li key={row.id} className="rounded-xl bg-surface-container-low p-3">
                      <Link href={ROUTES.profilUser(row.applicant.username)} className="type-label text-primary">@{row.applicant.username}</Link>
                      <p className="type-body">{row.applicant.displayName}</p>
                      <p className="type-caption text-on-surface-variant">{row.message || "Tanpa pesan"}</p>
                      {row.status === "PENDING" ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" className="btn-primary !min-h-10" disabled={pending} onClick={() => void act(`/api/v1/join-requests/${row.id}/review`, { decision: "accept" })}>Terima</button>
                          <button type="button" className="btn-secondary !min-h-10" disabled={pending} onClick={() => void act(`/api/v1/join-requests/${row.id}/review`, { decision: "reject" })}>Tolak</button>
                        </div>
                      ) : <p className="type-micro mt-1 uppercase">{row.status}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section className="card-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="type-subtitle">Diskusi publik</h2>
                <p className="type-caption mt-1 text-on-surface-variant">Tamu boleh membaca. Menulis butuh akun terverifikasi. Percakapan grup trip ada di halaman chat terpisah.</p>
              </div>
              {trip ? <ReportTargetButton targetType="trip" targetId={trip.id} label="Laporkan trip" /> : null}
            </div>
            <ul className="mt-4 flex flex-col gap-4">
              {threads.length === 0 ? <li className="type-body text-on-surface-variant">Belum ada komentar.</li> : threads.map(({ root, replies }) => (
                <li key={root.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="type-label">@{root.author.username}</p>
                    <ReportTargetButton targetType="comment" targetId={root.id} label="Laporkan" />
                  </div>
                  <p className="type-body">{root.body}</p>
                  <button type="button" className="type-micro mt-1 text-primary" onClick={() => setReplyTo(root.id)}>Balas</button>
                  {replies.map((reply) => (
                    <div key={reply.id} className="mt-2 ml-4 border-l border-outline-variant/40 pl-3">
                      <p className="type-label">@{reply.author.username}</p>
                      <p className="type-body">{reply.body}</p>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
            {isLoggedIn && emailVerified ? (
              <form className="mt-4 flex flex-col gap-3" onSubmit={onComment}>
                {replyTo ? <p className="type-caption">Membalas satu tingkat. <button type="button" className="text-primary" onClick={() => setReplyTo(null)}>Batal</button></p> : null}
                <textarea className="field-input min-h-24" required value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="Tulis komentar…" />
                <button type="submit" className="btn-primary" disabled={pending}>Kirim komentar</button>
              </form>
            ) : (
              <p className="type-body mt-4">{isLoggedIn ? "Verifikasi email dulu untuk menulis komentar." : <>Masuk untuk menulis komentar. <Link className="text-primary" href={`${ROUTES.masuk}?next=${encodeURIComponent(ROUTES.trip(tripId))}`}>Masuk</Link></>}</p>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 h-fit">
          {markers.length ? <div className="overflow-hidden rounded-[1.75rem]"><TripBoardMap markers={markers} /></div> : null}
          <section id="join" className="card-surface scroll-mt-24 p-5">
            <h2 className="type-subtitle">Ajukan join</h2>
            <p className="type-caption mt-1 text-on-surface-variant">Tidak ada booking atau pembayaran ke host. Setiap orang menanggung biayanya sendiri.</p>
            {joinCta === "login" ? <Link href={`${ROUTES.masuk}?next=${encodeURIComponent(ROUTES.trip(tripId))}`} className="btn-primary mt-4">Masuk untuk ajukan join</Link> : null}
            {joinCta === "unverified" ? <p className="type-body mt-3">Verifikasi email dulu untuk mengajukan join.</p> : null}
            {joinCta === "none" ? (
              <form className="mt-4 flex flex-col gap-3" onSubmit={onJoin}>
                <textarea className="field-input min-h-24" placeholder="Pesan singkat ke host (opsional)" value={joinMessage} onChange={(event) => setJoinMessage(event.target.value)} />
                <button type="submit" className="btn-primary" disabled={pending}>Ajukan join</button>
              </form>
            ) : null}
            {joinCta === "PENDING" ? <div className="mt-4"><p className="type-body">Pengajuan kamu sedang ditinjau host.</p><button type="button" className="btn-secondary mt-3" onClick={() => void act(`/api/v1/join-requests/${trip.myJoinRequest!.id}/withdraw`, {})} disabled={pending}>Tarik pengajuan</button></div> : null}
            {joinCta === "REJECTED" ? <p className="type-body mt-3">Host menolak pengajuan kamu.</p> : null}
            {joinCta === "ACCEPTED" || joinCta === "member" ? <p className="type-body mt-3">Kamu sudah jadi peserta trip ini.</p> : null}
            {joinCta === "host" ? <p className="type-body mt-3">Kamu host trip ini.</p> : null}
          </section>

          {error ? <p className="rounded-xl bg-error-container px-4 py-3 type-body text-on-error-container" role="alert">{error}</p> : null}
          {templateMessage ? (
            <p className="rounded-xl bg-secondary-container px-4 py-3 type-body text-on-secondary-container">
              {templateMessage}{" "}
              <Link href={`${ROUTES.jelajah}?tab=template`} className="font-bold text-primary">
                Lihat template
              </Link>
            </p>
          ) : null}

          {(trip.viewerRole === "host" || trip.viewerRole === "participant") ? (
            <>
              <LocationSharePanel tripId={trip.id} />
              <ShareLinkPanel tripId={trip.id} />
            </>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {(trip.viewerRole === "host" || trip.viewerRole === "participant") ? <Link href={ROUTES.tripChat(trip.id)} className="btn-primary"><Icon name="forum" /> Buka grup chat</Link> : null}
            {(trip.viewerRole === "host" || trip.viewerRole === "participant") ? <ItineraryPdfButton tripId={trip.id} className="btn-ghost" label="Unduh itinerary PDF" /> : null}
            {(trip.viewerRole === "host" || trip.viewerRole === "participant") ? (
              <button type="button" className="btn-ghost" disabled={navPending} onClick={() => void openNavigation()}>
                <Icon name="map" /> {navPending ? "Menyiapkan peta…" : "Buka Google Maps"}
              </button>
            ) : null}
            {trip.viewerRole === "host" ? <Link href={tripItineraryPath(trip.id)} className="btn-ghost">Edit itinerary</Link> : null}
            {trip.viewerRole === "host" && trip.status !== "CANCELLED" && trip.status !== "COMPLETED" ? <Link href={tripEditHref(trip.id)} className="btn-ghost">Edit trip</Link> : null}
            {trip.viewerRole === "host" && trip.status === "DRAFT" ? <button type="button" className="btn-primary" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/publish`, { confirmPublish: true, visibility: trip.visibility })}>Publish</button> : null}
            {trip.viewerRole === "host" && trip.status === "OPEN" ? <button type="button" className="btn-ghost" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/transition`, { action: "close" })}>Tutup pengajuan</button> : null}
            {trip.viewerRole === "host" && trip.status === "CLOSED" ? <button type="button" className="btn-primary" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/transition`, { action: "reopen" })}>Buka lagi</button> : null}
            {trip.viewerRole === "host" && (trip.status === "OPEN" || trip.status === "CLOSED") ? <button type="button" className="btn-ghost" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/transition`, { action: "start" })}>Mulai trip</button> : null}
            {trip.viewerRole === "host" && trip.status === "ONGOING" ? <button type="button" className="btn-primary" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/transition`, { action: "complete" })}>Selesai</button> : null}
            {trip.viewerRole === "host" && trip.status === "COMPLETED" ? (
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={() => void act(`/api/v1/trips/${trip.id}/publish-as-template`, {})}
              >
                Publikasikan sebagai template
              </button>
            ) : null}
            {trip.viewerRole === "host" && trip.status !== "CANCELLED" && trip.status !== "COMPLETED" ? <button type="button" className="btn-ghost" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/transition`, { action: "cancel" })}>Batalkan</button> : null}
            {trip.viewerRole === "participant" && trip.status !== "ONGOING" ? <button type="button" className="btn-ghost" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/leave`, {})}>Keluar trip</button> : null}
            {trip.viewerRole === "participant" && trip.status === "ONGOING" ? (
              confirmLeave ? (
                <div className="flex w-full flex-col gap-2 rounded-xl bg-error-container p-4">
                  <p className="type-caption text-on-error-container">Trip sedang berlangsung. Konfirmasi dulu sebelum keluar.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-ghost" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/leave`, { confirmLeave: true })}>Ya, keluar</button>
                    <button type="button" className="btn-ghost" onClick={() => setConfirmLeave(false)}>Batal</button>
                  </div>
                </div>
              ) : <button type="button" className="btn-ghost" disabled={pending} onClick={() => setConfirmLeave(true)}>Keluar trip</button>
            ) : null}
          </div>
          {trip.status === "COMPLETED" &&
          (trip.viewerRole === "host" || trip.viewerRole === "participant") ? (
            <AttendanceConfirm
              tripId={trip.id}
              tripTitle={trip.title}
              reviewUsername={trip.viewerRole === "participant" ? trip.host.username : null}
            />
          ) : null}
          <Link href={visitor ? ROUTES.beranda : ROUTES.tripSaya} className="type-label inline-block text-primary">{visitor ? "Kembali ke beranda" : "Kembali ke Trip Saya"}</Link>
        </aside>
      </div>
    </main>
  );
}

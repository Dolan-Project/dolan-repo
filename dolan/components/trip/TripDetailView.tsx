"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { connectDolanSocket } from "@/lib/realtime/dolan-socket";
import { Icon } from "@/components/ui/Icon";
import { ProfileSocialLinks } from "@/components/profile/ProfileSocialLinks";
import { AttendanceConfirm } from "@/components/trips/AttendanceConfirm";
import { ReportTargetButton } from "@/components/moderation/ReportTargetButton";
import { PlacePhoto } from "@/features/explore/PlacePhoto";
import { destinationCoverUrl, resolveTripItineraryDays } from "@/lib/destination-itinerary";
import type { ApiError, JoinRequest, TripComment, TripDetail } from "@/lib/contracts";
import { ROUTES, tripEditHref, tripItineraryPath } from "@/lib/routes";
import type { EditableItineraryDay, TripChecklistItem } from "@dolan/shared";
import { hydrateItineraryPlaces, itineraryMapMarkers, itineraryMapRouteGroups, visitWindowLabel, googleMapsDirectionsUrl } from "@/lib/template-itinerary";
import { ItineraryTimeline } from "@/components/trip/ItineraryTimeline";
import { ItineraryPdfButton } from "./ItineraryPdfButton";
import { LocationSharePanel } from "./LocationSharePanel";
import { ShareLinkPanel } from "./ShareLinkPanel";
import { TripBoardMap, type TripMapMarker } from "./TripBoardMap";

type Json<T> = { success: true; data: T } | ApiError;

async function readJson<T>(response: Response): Promise<Json<T>> {
  return (await response.json()) as Json<T>;
}

function dateLabel(start: string | null, end: string | null) {
  if (!start && !end) return "Tanggal fleksibel";
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const format = (value: string) => formatter.format(new Date(`${value}T00:00:00`));
  if (!start) return format(end!);
  if (!end || start === end) return format(start);
  return `${format(start)} – ${format(end)}`;
}

function durationLabel(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const nights = Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000);
  if (nights < 0) return null;
  return `${nights + 1} Hari ${nights} Malam`;
}

function dayChip(day: EditableItineraryDay) {
  if (!day.date) return `Hari ${day.dayNumber}`;
  const formatted = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(`${day.date}T00:00:00`));
  return `Hari ${day.dayNumber} (${formatted})`;
}

function coverFallback(city: string | null) {
  return destinationCoverUrl(city ?? "");
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function mergeComment(current: TripComment[], incoming: TripComment) {
  const index = current.findIndex((row) => row.id === incoming.id);
  if (index < 0) return [...current, incoming];
  const next = [...current];
  next[index] = incoming;
  return next;
}

function removeComment(current: TripComment[], commentId: string) {
  return current.filter((row) => row.id !== commentId && row.parentId !== commentId);
}

function apiErrorText(error: { code?: string; message: string } | undefined, fallback: string) {
  if (!error?.message) return fallback;
  if (error.code === "PROFILE_INCOMPLETE") {
    return "Lengkapi profil dulu (nama, username, dan domisili) sebelum mengajukan join.";
  }
  return error.message;
}

export function TripDetailView({
  tripId,
  isLoggedIn,
}: {
  tripId: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [comments, setComments] = useState<TripComment[]>([]);
  const [days, setDays] = useState<EditableItineraryDay[]>([]);
  const [packing, setPacking] = useState<TripChecklistItem[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState("");
  const [joinAck, setJoinAck] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [routeMarkers, setRouteMarkers] = useState<TripMapMarker[]>([]);
  const [followingHost, setFollowingHost] = useState(false);
  const [shareHint, setShareHint] = useState("");
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
    const itineraryDays = (itineraryRes as { success?: boolean; data?: { versions?: Array<{ id: string; days: EditableItineraryDay[] }>; activeVersionId?: string; checklist?: TripChecklistItem[] } } | null)?.data;
    const active = itineraryDays?.versions?.find((version) => version.id === itineraryDays.activeVersionId) ?? itineraryDays?.versions?.[0];
    const nextDays = hydrateItineraryPlaces(resolveTripItineraryDays({
      destination: tripRes.data.destinationCity ?? "",
      startDate: tripRes.data.startDate,
      endDate: tripRes.data.endDate,
      days: active?.days ?? [],
    }), tripRes.data.destinationCity ?? "");
    setDays(nextDays);
    setPacking(itineraryDays?.checklist ?? []);
    setActiveDayId((current) => current && nextDays.some((day) => day.id === current) ? current : nextDays[0]?.id ?? null);
    const points = (routeRes as { success?: boolean; data?: { points?: Array<{ id: string; label: string; lat: number; lng: number }> } } | null)?.data?.points ?? [];
    setRouteMarkers(points.map((point, index) => ({ id: point.id, label: point.label, latitude: point.lat, longitude: point.lng, selected: index === 0 })));
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const socket = connectDolanSocket();
    const join = () => {
      socket.emit("comments.join", { tripId });
    };
    socket.on("connect", join);
    socket.on("comment.created", (comment: TripComment) => {
      if (comment.tripId !== tripId) return;
      setComments((current) => mergeComment(current, comment));
    });
    socket.on("comment.updated", (comment: TripComment) => {
      if (comment.tripId !== tripId) return;
      setComments((current) => mergeComment(current, comment));
    });
    socket.on("comment.deleted", (payload: { tripId?: string; commentId?: string }) => {
      if (payload.tripId !== tripId || !payload.commentId) return;
      setComments((current) => removeComment(current, payload.commentId!));
    });
    let reloadTimer: number | undefined;
    const reloadTrip = (payload: { tripId?: string }) => {
      if (payload.tripId !== tripId) return;
      window.clearTimeout(reloadTimer);
      reloadTimer = window.setTimeout(() => {
        void loadAll();
      }, 80);
    };
    socket.on("join_request.created", reloadTrip);
    socket.on("join_request.reviewed", reloadTrip);
    return () => {
      window.clearTimeout(reloadTimer);
      socket.disconnect();
    };
  }, [tripId, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setMeId(null);
      return;
    }
    const controller = new AbortController();
    void fetch("/api/v1/users/me", { credentials: "include", signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload: { success?: boolean; data?: { user?: { id?: string } } } | null) => {
        if (!controller.signal.aborted) setMeId(payload?.data?.user?.id ?? null);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isLoggedIn]);

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
      headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
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
    const editing = Boolean(editingCommentId);
    const response = await readJson<TripComment>(
      await fetch(
        editing
          ? `/api/v1/trips/${tripId}/comments/${encodeURIComponent(editingCommentId!)}`
          : `/api/v1/trips/${tripId}/comments`,
        {
          method: editing ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            ...(editing ? {} : { "Idempotency-Key": crypto.randomUUID() }),
          },
          body: JSON.stringify(
            editing
              ? { body: commentBody }
              : { body: commentBody, parentId: replyTo ?? undefined },
          ),
        },
      ),
    );
    setPending(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setComments((current) => mergeComment(current, response.data));
    setCommentBody("");
    setReplyTo(null);
    setEditingCommentId(null);
  }

  async function onDeleteComment(commentId: string) {
    setPending(true);
    setError("");
    const response = await readJson<{ deleted?: boolean }>(
      await fetch(`/api/v1/trips/${tripId}/comments/${encodeURIComponent(commentId)}`, {
        method: "DELETE",
        credentials: "include",
      }),
    );
    setPending(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setCommentBody("");
    }
    setComments((current) => removeComment(current, commentId));
  }

  async function onJoin(event: React.FormEvent) {
    event.preventDefault();
    if (!joinAck) {
      setError("Centang dulu bahwa trip ini swadaya mandiri.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await readJson<JoinRequest>(await fetch(`/api/v1/trips/${tripId}/join-requests`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ message: joinMessage || undefined }),
      }));
      if (!response.success) {
        setError(apiErrorText(response.error, "Pengajuan gagal dikirim. Coba lagi."));
        return;
      }
      setJoinMessage("");
      setJoinAck(false);
      setJoinModal(false);
      await loadAll();
    } catch {
      setError("Pengajuan gagal dikirim. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  async function onFollowHost() {
    if (!trip || !isLoggedIn) {
      router.push(`${ROUTES.masuk}?next=${encodeURIComponent(ROUTES.trip(tripId))}`);
      return;
    }
    setPending(true);
    const response = await fetch(`/api/v1/users/${trip.host.username}/follow`, {
      method: followingHost ? "DELETE" : "POST",
      credentials: "include",
    });
    const json = (await response.json()) as { success: boolean; error?: { message: string } };
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Tidak bisa follow sekarang");
      return;
    }
    setFollowingHost((value) => !value);
  }

  async function onShare() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: trip?.title ?? "Trip Dolan", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareHint("Tautan disalin");
      window.setTimeout(() => setShareHint(""), 2000);
    } catch {
      setShareHint("");
    }
  }

  async function togglePacking(item: TripChecklistItem) {
    const nextCompleted = !item.isCompleted;
    setPacking((current) => current.map((entry) => entry.id === item.id ? { ...entry, isCompleted: nextCompleted } : entry));
    const response = await fetch(`/api/v1/trips/${tripId}/checklist`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, title: item.title, isCompleted: nextCompleted, dueDate: item.dueDate }),
    });
    const json = (await response.json()) as { success: boolean; error?: { message: string } };
    if (!json.success) {
      setPacking((current) => current.map((entry) => entry.id === item.id ? { ...entry, isCompleted: item.isCompleted } : entry));
      setError(json.error?.message ?? "Perlengkapan belum bisa diperbarui");
    }
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
  const itineraryMarkers: TripMapMarker[] = itineraryMapMarkers(days, null, trip.destinationCity ?? "").map((marker, index) => ({
    ...marker,
    selected: index === 0 || marker.selected,
  }));
  const markers: TripMapMarker[] = itineraryMarkers.length
    ? itineraryMarkers
    : routeMarkers.length
      ? routeMarkers
      : trip.publicMeetingPointLatitude != null && trip.publicMeetingPointLongitude != null
        ? [{ id: "meeting", label: meetingLabel ?? "Titik temu", latitude: trip.publicMeetingPointLatitude, longitude: trip.publicMeetingPointLongitude, selected: true }]
        : [];
  const joinStatus = trip.myJoinRequest?.status === "WITHDRAWN" ? undefined : trip.myJoinRequest?.status;
  const isPublic = trip.visibility === "PUBLIC";
  const joinCta = !isPublic && trip.viewerRole !== "host" && trip.viewerRole !== "participant"
    ? "none"
    : !isLoggedIn ? "login" : trip.viewerRole === "host" ? "host" : trip.viewerRole === "participant" ? "member" : joinStatus ?? "none";
  const members = trip.members ?? [trip.host];
  const genderLabel = trip.genderRule === "FEMALE_ONLY" ? "Khusus perempuan" : trip.genderRule === "MALE_ONLY" ? "Khusus laki-laki" : "Semua gender";
  const duration = durationLabel(trip.startDate, trip.endDate);
  const remaining = trip.maxParticipants != null ? Math.max(0, trip.maxParticipants - trip.activeParticipantCount) : null;
  const full = trip.status === "CLOSED" || (remaining === 0 && trip.maxParticipants != null);
  const cancelled = trip.status === "CANCELLED";
  const coverStop = days.flatMap((day) => day.stops).find((stop) => stop.place?.photoName);
  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0];
  const mapsHref = googleMapsDirectionsUrl(markers);
  const slotPill = cancelled
    ? { label: "Dibatalkan", className: "bg-error text-white" }
    : full
      ? { label: trip.maxParticipants ? `Kuota Penuh (${trip.activeParticipantCount}/${trip.maxParticipants})` : "Pengajuan ditutup", className: "bg-on-surface-variant text-white" }
      : remaining != null
        ? { label: `Tersedia ${remaining} Slot`, className: "bg-emerald-500 text-white" }
        : { label: "Slot terbuka", className: "bg-emerald-500 text-white" };

  return (
    <div className="bg-[#f7fbff] pb-28 md:pb-16">
      {cancelled ? (
        <div className="border-b border-rose-200 bg-rose-50 px-margin py-3 text-rose-800 md:px-margin-desktop">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-sm">
            <p className="flex items-center gap-2 font-semibold"><Icon name="info" className="text-[20px] text-rose-600" /> Trip ini telah dibatalkan oleh host</p>
            <span className="hidden rounded bg-rose-100 px-2.5 py-1 type-micro text-rose-800 sm:inline">Pengajuan Ditutup</span>
          </div>
        </div>
      ) : null}

      <div className="sticky top-14 z-40 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-margin py-3 backdrop-blur-md md:hidden">
        <Link href={visitor ? ROUTES.jelajah : ROUTES.tripSaya} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100" aria-label="Kembali">
          <Icon name="arrow_back" className="text-[20px]" />
        </Link>
        <div className="min-w-0 text-center">
          <p className="type-micro uppercase tracking-wider text-primary">{trip.visibility === "PUBLIC" ? "Trip publik" : "Trip privat"}</p>
          <p className="truncate type-label">{trip.title}</p>
        </div>
        <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100" aria-label="Bagikan" onClick={() => void onShare()}>
          <Icon name="share" className="text-[18px]" />
        </button>
      </div>

      <div className="hidden border-b border-slate-200/60 bg-white py-3 md:block">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-margin-desktop type-caption text-on-surface-variant">
          <nav className="flex min-w-0 items-center gap-2">
            <Link href={ROUTES.jelajah} className="hover:text-primary">Explore Trip</Link>
            <span>/</span>
            <span className="truncate font-semibold text-on-surface">{trip.title}</span>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium hover:bg-slate-100" onClick={() => void onShare()}>
              <Icon name="share" className="text-[16px]" /> Bagikan
            </button>
            {shareHint ? <span className="text-primary">{shareHint}</span> : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-margin py-6 md:px-margin-desktop">
        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,36,58,.04)]">
          <div className="relative h-64 w-full bg-slate-800 sm:h-80 lg:h-96">
            {coverStop?.place ? (
              <PlacePhoto googlePlaceId={coverStop.place.googlePlaceId} photoName={coverStop.place.photoName} alt={trip.title} eager className="absolute inset-0 h-full w-full opacity-90" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" src={coverFallback(trip.destinationCity)} className="h-full w-full object-cover opacity-90" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
            <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${trip.visibility === "PUBLIC" ? "bg-primary text-white" : "bg-[#071c32] text-white"}`}>
                  {trip.visibility === "PUBLIC" ? "Publik" : "Private"}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${slotPill.className}`}>
                  {!cancelled && !full ? <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> : null}
                  {slotPill.label}
                </span>
              </div>
              <span className="hidden items-center gap-2 rounded-full border border-white/20 bg-slate-900/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md sm:inline-flex">
                <Icon name="location_on" className="text-[14px] text-[#ff8a3d]" filled />
                {trip.destinationCity || "Tujuan fleksibel"}
              </span>
            </div>
            <div className="absolute inset-x-4 bottom-5 text-white sm:inset-x-6 sm:bottom-6">
              <div className="mb-2 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-200 sm:text-sm">
                <span className="inline-flex items-center gap-1.5 rounded bg-primary/80 px-2.5 py-0.5 font-semibold text-white">
                  <Icon name="calendar_month" className="text-[16px]" />
                  {dateLabel(trip.startDate, trip.endDate)}{duration ? ` (${duration})` : ""}
                </span>
                {meetingLabel ? <span>• Titik kumpul: <strong className="text-white">{meetingLabel}</strong></span> : null}
                <span>• Kuota: <strong className="text-white">{trip.activeParticipantCount}{trip.maxParticipants ? ` / ${trip.maxParticipants}` : ""} traveler</strong></span>
              </div>
              <h1 className="mb-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">{trip.title}</h1>
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-sky-100 backdrop-blur-md sm:text-sm">
                <Icon name="check_circle" className="text-[16px] text-emerald-400" />
                <span><strong>Join gratis</strong> · Biaya perjalanan ditanggung masing-masing (swadaya tanpa komisi)</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,36,58,.04)] md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-primary bg-primary-fixed text-lg font-extrabold text-primary ring-4 ring-primary-fixed">
                      {trip.host.avatarUrl ? <img src={trip.host.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(trip.host.displayName)}
                    </div>
                    <span className="absolute bottom-0 right-0 rounded-full bg-primary p-1 text-white"><Icon name="person" className="text-[12px]" /></span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-on-surface">{trip.host.displayName}</h2>
                      <span className="rounded border border-primary/20 bg-primary-fixed px-2 py-0.5 text-xs font-semibold text-primary">Host Inisiator</span>
                    </div>
                    <p className="type-caption text-on-surface-variant">@{trip.host.username}{trip.host.domicile ? ` · ${trip.host.domicile}` : ""}</p>
                    <ProfileSocialLinks
                      instagramUrl={trip.host.instagramUrl}
                      tiktokUrl={trip.host.tiktokUrl}
                      compact
                      className="mt-1.5"
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-on-surface">
                        <Icon name="star" className="text-[16px] text-amber-500" filled />
                        {trip.host.rating.overall?.toFixed(2) ?? "—"}{" "}
                        <span className="font-normal text-on-surface-variant">({trip.host.rating.reviewCount} ulasan rekan jalan)</span>
                      </span>
                      <span className="text-on-surface-variant">{trip.host.hostTripCount} trip sebagai host</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={ROUTES.profilUser(trip.host.username)} className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-on-surface hover:bg-slate-50">Lihat Profil</Link>
                  {trip.viewerRole !== "host" ? (
                    <button type="button" disabled={pending} onClick={() => void onFollowHost()} className="rounded-lg border border-primary/20 bg-primary-fixed px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary-fixed-dim">
                      {followingHost ? "Mengikuti" : "+ Ikuti"}
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,36,58,.04)] md:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-on-surface">
                <Icon name="payments" className="text-[20px] text-primary" /> Informasi Logistik & Pola Perjalanan
              </h2>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LogisticCard label={trip.visibility === "PUBLIC" ? "Titik kumpul publik" : "Titik kumpul"} value={meetingLabel ?? "Belum ditentukan"} hint={trip.timezone} />
                <LogisticCard label="Aturan peserta" value={genderLabel} hint={trip.visibility === "PUBLIC" ? "Trip publik" : "Trip privat"} />
              </div>
              <div className="border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface">Perkiraan pengeluaran pribadi</h3>
                    <p className="text-[11px] text-on-surface-variant">Bukan harga paket tur · Estimasi swadaya per orang</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-primary">~Rp {perPerson.toLocaleString("id-ID")}</p>
                    <p className="text-xs text-on-surface-variant">/ orang (estimasi)</p>
                  </div>
                </div>
                {trip.communityRules ? <p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-xs text-on-surface-variant">{trip.communityRules}</p> : null}
                <p className="mt-2 text-[11px] italic text-on-surface-variant">Rencana {trip.planningPartySize} orang{trip.maxParticipants ? ` · kapasitas ${trip.maxParticipants}` : ""}. Tidak ada komisi ke host atau platform.</p>
              </div>
            </section>

            {days.length > 0 ? (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,36,58,.04)] md:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-on-surface">Rencana Perjalanan (Itinerary)</h2>
                    <p className="text-xs text-on-surface-variant">{days.length} hari · rute dari host</p>
                  </div>
                  {mapsHref ? (
                    <a href={mapsHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-container">
                      Buka rute di Google Maps <Icon name="arrow_forward" className="text-[14px]" />
                    </a>
                  ) : trip.viewerRole === "host" ? (
                    <Link href={tripItineraryPath(trip.id)} className="text-xs font-bold text-primary">Edit itinerary</Link>
                  ) : null}
                </div>
                <div className="mb-5 flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-3 text-xs font-semibold">
                  {days.map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => setActiveDayId(day.id)}
                      className={day.id === activeDay?.id ? "rounded-lg bg-primary px-3 py-1.5 text-white shadow-sm" : "rounded-lg px-3 py-1.5 text-on-surface-variant hover:bg-slate-100"}
                    >
                      {dayChip(day)}
                    </button>
                  ))}
                </div>
                {activeDay ? (
                  <ItineraryTimeline
                    items={activeDay.stops.map((stop) => {
                      const colorIndex = Math.max(0, days.flatMap((day) => day.stops).findIndex((item) => item.id === stop.id));
                      return {
                        id: stop.id,
                        index: colorIndex,
                        sequence: stop.sequence,
                        title: stop.place?.name ?? stop.customTitle ?? "Titik perjalanan",
                        meta: visitWindowLabel(stop.startTime, stop.durationMinutes) || undefined,
                        notes: stop.notes ?? undefined,
                      };
                    })}
                  />
                ) : null}
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,36,58,.04)] md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-on-surface">Peserta terkonfirmasi ({trip.activeParticipantCount}{trip.maxParticipants ? `/${trip.maxParticipants}` : ""})</h2>
                  <p className="text-xs text-on-surface-variant">Traveler yang telah disetujui host</p>
                </div>
                {remaining != null && remaining > 0 ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Sisa {remaining} slot</span>
                ) : null}
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {members.map((member) => (
                  <li key={member.id} className={`flex items-center gap-3 rounded-xl p-3 ${member.id === trip.host.id ? "border border-slate-100 bg-slate-50" : "border border-slate-200 bg-white"}`}>
                    <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-primary text-sm font-extrabold text-white">
                      {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(member.displayName)}
                    </div>
                    <div className="min-w-0 text-xs">
                      <Link href={ROUTES.profilUser(member.username)} className="block font-bold text-on-surface hover:text-primary">{member.displayName}</Link>
                      <p className={member.id === trip.host.id ? "text-[11px] font-semibold text-primary" : "text-[11px] text-on-surface-variant"}>
                        {member.id === trip.host.id ? "Host / Inisiator" : `@${member.username}${member.domicile ? ` · ${member.domicile}` : ""}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-on-surface-variant">*Daftar pelamar yang masih ditinjau hanya dapat dilihat secara privat oleh host.</p>
            </section>

            {packing.length ? (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,36,58,.04)] md:p-6">
                <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-on-surface">
                  <Icon name="luggage" className="text-[20px] text-primary" /> List perlengkapan
                </h2>
                <p className="mb-4 text-xs text-on-surface-variant">
                  {trip.viewerRole === "host" || trip.viewerRole === "participant"
                    ? "Centang barang yang sudah disiapkan. Daftar ini mengikuti trip, bukan chat publik."
                    : "Host menyiapkan daftar ini. Checklist terbuka setelah kamu diterima di trip."}
                </p>
                <ul className="space-y-2">
                  {packing.map((item) => {
                    const canCheck = trip.viewerRole === "host" || trip.viewerRole === "participant";
                    return (
                      <li key={item.id}>
                        <label className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${canCheck ? "cursor-pointer bg-slate-50 hover:bg-slate-100" : "bg-slate-50"}`}>
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            disabled={!canCheck || pending}
                            onChange={() => void togglePacking(item)}
                          />
                          <span className={`text-sm ${item.isCompleted ? "text-on-surface-variant line-through" : "text-on-surface"}`}>{item.title}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,36,58,.04)] md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-on-surface">Tanya Jawab & Diskusi Publik</h2>
                  <p className="text-xs text-on-surface-variant">Ajukan pertanyaan seputar rencana atau perkenalkan diri sebelum join</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs font-medium text-on-surface-variant sm:inline">Bukan grup chat internal</span>
                  <ReportTargetButton targetType="trip" targetId={trip.id} label="Laporkan trip" />
                </div>
              </div>
              {isLoggedIn ? (
                <form className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4" onSubmit={onComment}>
                  {editingCommentId ? (
                    <p className="mb-2 type-caption">
                      Mengedit komentar.{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary"
                        onClick={() => {
                          setEditingCommentId(null);
                          setCommentBody("");
                        }}
                      >
                        Batal
                      </button>
                    </p>
                  ) : replyTo ? (
                    <p className="mb-2 type-caption">
                      Membalas satu tingkat.{" "}
                      <button type="button" className="font-semibold text-primary" onClick={() => setReplyTo(null)}>
                        Batal
                      </button>
                    </p>
                  ) : null}
                  <textarea className="field-input min-h-20 text-xs" required value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder={editingCommentId ? "Perbarui komentar…" : `Tulis pertanyaan untuk host ${trip.host.displayName}…`} />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-on-surface-variant">Diskusi ini dapat dibaca oleh publik</span>
                    <button type="submit" className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white" disabled={pending}>{editingCommentId ? "Simpan perubahan" : "Kirim komentar"}</button>
                  </div>
                </form>
              ) : (
                <p className="mb-6 rounded-xl bg-slate-50 p-4 type-body text-on-surface-variant">Masuk untuk menulis komentar. <Link className="font-semibold text-primary" href={`${ROUTES.masuk}?next=${encodeURIComponent(ROUTES.trip(tripId))}`}>Masuk</Link></p>
              )}
              {threads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                  <Icon name="forum" className="mx-auto text-[40px] text-slate-300" />
                  <p className="mt-2 text-xs font-bold text-on-surface">Belum ada komentar publik</p>
                  <p className="mt-0.5 text-[11px] text-on-surface-variant">Jadilah yang pertama menyapa host atau bertanya seputar trip ini.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {threads.map(({ root, replies }) => (
                    <li key={root.id} className="space-y-3 rounded-xl border border-slate-100 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-on-surface">@{root.author.username}</p>
                          {root.author.id === trip.host.id ? <span className="text-[10px] font-bold text-primary">Host</span> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ReportTargetButton targetType="comment" targetId={root.id} label="Laporkan" />
                          {meId && root.author.id === meId ? (
                            <>
                              <button
                                type="button"
                                className="text-[11px] font-semibold text-on-surface-variant hover:text-primary"
                                onClick={() => {
                                  setEditingCommentId(root.id);
                                  setReplyTo(null);
                                  setCommentBody(root.body);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-[11px] font-semibold text-error hover:underline"
                                disabled={pending}
                                onClick={() => void onDeleteComment(root.id)}
                              >
                                Hapus
                              </button>
                            </>
                          ) : (
                            <button type="button" className="text-[11px] font-semibold text-on-surface-variant hover:text-primary" onClick={() => setReplyTo(root.id)}>Balas</button>
                          )}
                        </div>
                      </div>
                      <p className="pl-0 text-xs text-on-surface sm:pl-0">{root.body}</p>
                      {replies.map((reply) => (
                        <div key={reply.id} className="ml-6 flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary-fixed/40 p-3">
                          <div className="min-w-0 flex-1 text-xs">
                            <div className="mb-1 flex items-center gap-1.5">
                              <span className="font-bold text-on-surface">@{reply.author.username}</span>
                              {reply.author.id === trip.host.id ? <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">Host</span> : null}
                            </div>
                            <p className="text-on-surface-variant">{reply.body}</p>
                          </div>
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
            <section className="rounded-2xl border-2 border-primary/20 bg-white p-6 shadow-md">
              {!cancelled && joinCta === "login" && isPublic ? (
                <div className="space-y-4 text-center">
                  <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-on-surface-variant"><Icon name="login" className="text-[24px]" /></div>
                  <h2 className="text-sm font-bold">Masuk untuk mengajukan join</h2>
                  <p className="text-xs text-on-surface-variant">Kamu bisa membaca detail trip dan komentar secara bebas. Untuk mengajukan diri, masuk ke akun Dolan.</p>
                  <Link href={`${ROUTES.masuk}?next=${encodeURIComponent(ROUTES.trip(tripId))}`} className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-white">Masuk / Daftar akun</Link>
                </div>
              ) : null}
              {cancelled && joinCta !== "host" ? (
                <ClosedJoin title="Trip resmi dibatalkan" body="Tidak menerima pengajuan baru karena rencana perjalanan telah dibatalkan." action="Trip tidak aktif" />
              ) : null}
              {!cancelled && joinCta === "none" && full ? (
                <ClosedJoin title={`Kuota partisipan sudah penuh${trip.maxParticipants ? ` (${trip.activeParticipantCount}/${trip.maxParticipants})` : ""}`} body="Seluruh slot telah terisi oleh traveler terkonfirmasi." action="Pengajuan ditutup (penuh)" />
              ) : null}
              {!cancelled && joinCta === "none" && !full && isPublic ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status partisipasi</span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">Slot tersedia</span>
                  </div>
                  <div>
                    <span className="block text-xs text-on-surface-variant">Estimasi patungan swadaya:</span>
                    <p className="flex items-baseline gap-1.5"><span className="text-2xl font-black text-on-surface">~Rp {perPerson.toLocaleString("id-ID")}</span><span className="text-xs text-on-surface-variant">/ orang</span></p>
                    <p className="mt-1 text-[11px] text-on-surface-variant">Tanpa biaya pendaftaran. Pembayaran logistik diurus langsung bersama host.</p>
                  </div>
                  <div className="space-y-1.5 rounded-xl border border-primary/15 bg-primary-fixed/50 p-3.5 text-xs">
                    <p className="flex items-center gap-1.5 font-bold text-on-surface"><Icon name="info" className="text-[16px] text-primary" /> Perlu persetujuan host</p>
                    <p className="text-[11px] leading-normal text-primary">Host akan meninjau profil dan catatan pengajuanmu sebelum memasukkanmu ke kuota resmi dan grup chat trip.</p>
                  </div>
                  <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff8a3d] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#ea580c]" onClick={() => setJoinModal(true)}>
                    Ajukan Join Trip <Icon name="arrow_forward" className="text-[16px]" />
                  </button>
                  <p className="text-center text-[10px] text-on-surface-variant">Gratis · Tanpa deposit kartu kredit / bank</p>
                </div>
              ) : null}
              {!cancelled && joinCta === "PENDING" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <p className="mb-1 flex items-center gap-2 text-sm font-bold text-amber-800"><Icon name="schedule" className="text-[20px] text-amber-600" /> Pengajuan sedang dipertimbangkan host</p>
                    <p className="text-xs leading-relaxed text-amber-700">Pengajuanmu telah dikirim ke <strong>{trip.host.displayName}</strong>. Kamu tetap bisa berdiskusi di komentar publik. Akses grup chat dibuka setelah disetujui.</p>
                  </div>
                  {trip.myJoinRequest?.message ? (
                    <div className="rounded-lg bg-slate-50 p-3 text-xs text-on-surface-variant">
                      <span className="block font-semibold text-on-surface">Catatan yang kamu kirim:</span>
                      <p className="mt-1 italic text-[11px]">“{trip.myJoinRequest.message}”</p>
                    </div>
                  ) : null}
                  <button type="button" className="w-full rounded-xl border border-rose-200 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50" disabled={pending} onClick={() => void act(`/api/v1/join-requests/${trip.myJoinRequest!.id}/withdraw`, {})}>Batalkan pengajuan join</button>
                </div>
              ) : null}
              {!cancelled && joinCta === "REJECTED" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
                    <h2 className="mb-1 text-xs font-bold">Pengajuan belum dapat diterima</h2>
                    <p className="text-xs leading-relaxed text-on-surface-variant">Host memilih kombinasi rekan perjalanan lain untuk trip ini.</p>
                  </div>
                  <Link href={ROUTES.jelajah} className="flex w-full items-center justify-center rounded-xl border border-primary/20 bg-primary-fixed py-2.5 text-xs font-bold text-primary">Cari open trip lainnya</Link>
                </div>
              ) : null}
              {joinCta === "ACCEPTED" || joinCta === "member" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                    <p className="mb-1 flex items-center gap-2 text-sm font-bold text-emerald-800"><Icon name="check_circle" className="text-[20px] text-emerald-600" /> Selamat! Pengajuanmu diterima</p>
                    <p className="text-xs leading-relaxed text-emerald-700">Kamu resmi menjadi bagian dari trip ini bersama {trip.host.displayName}.</p>
                  </div>
                  <Link href={ROUTES.tripChat(trip.id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white"><Icon name="forum" /> Masuk ke grup chat trip</Link>
                  <Link href={ROUTES.tripSaya} className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-on-surface hover:bg-slate-50">Buka di Trip Saya</Link>
                </div>
              ) : null}
              {joinCta === "host" ? (
                <div className="space-y-3">
                  <p className="type-body">Kamu host trip ini. Tinjau permintaan gabung dari halaman Trip Saya.</p>
                  <Link href={ROUTES.tripChat(trip.id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white">
                    <Icon name="forum" /> Masuk ke grup chat trip
                  </Link>
                </div>
              ) : null}
            </section>

            <section className="space-y-2 rounded-2xl border border-sky-100 bg-sky-50/70 p-5 text-xs text-sky-900">
              <p className="flex items-center gap-2 font-bold text-sky-950"><Icon name="lock" className="text-[16px] text-primary" /> Prinsip Sosial DOLAN</p>
              <p className="text-[11px] leading-relaxed text-sky-800">Dolan menghubungkan sesama petualang secara swadaya. Tidak ada transaksi tiket atau komisi platform. Pastikan selalu berdiskusi transparan dan saling menghargai sesama rekan jalan.</p>
            </section>

            <div className="h-[320px] overflow-hidden rounded-2xl border border-slate-200 md:h-[440px]">
              {markers.length ? (
                <TripBoardMap markers={markers} numberedBadges routeGroups={itineraryMapRouteGroups(days, trip.destinationCity ?? "")} />
              ) : (
                <div className="grid h-full place-items-center bg-surface-container px-4 text-center type-caption text-on-surface-variant">Peta rute muncul setelah itinerary punya koordinat.</div>
              )}
            </div>
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
                <div className="flex flex-wrap gap-2">
                  <Link href={ROUTES.tripChat(trip.id)} className="btn-primary"><Icon name="forum" /> Buka grup chat</Link>
                  <ItineraryPdfButton tripId={trip.id} className="btn-ghost" label="Unduh itinerary PDF" />
                  <button type="button" className="btn-ghost" disabled={navPending} onClick={() => void openNavigation()}>
                    <Icon name="map" /> {navPending ? "Menyiapkan peta…" : "Buka Google Maps"}
                  </button>
                  {trip.viewerRole === "host" ? <Link href={tripItineraryPath(trip.id)} className="btn-ghost">Edit itinerary</Link> : null}
                  {trip.viewerRole === "host" && trip.status !== "CANCELLED" && trip.status !== "COMPLETED" ? <Link href={tripEditHref(trip.id)} className="btn-ghost">Edit trip</Link> : null}
                  {trip.viewerRole === "host" && trip.status === "DRAFT" ? <button type="button" className="btn-primary" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/publish`, { confirmPublish: true, visibility: trip.visibility })}>Publish</button> : null}
                  {trip.viewerRole === "host" && trip.status === "OPEN" ? <button type="button" className="btn-ghost" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/transition`, { action: "close" })}>Tutup pengajuan</button> : null}
                  {trip.viewerRole === "host" && trip.status === "CLOSED" ? <button type="button" className="btn-primary" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/transition`, { action: "reopen" })}>Buka lagi</button> : null}
                  {trip.viewerRole === "host" && (trip.status === "OPEN" || trip.status === "CLOSED") ? <button type="button" className="btn-ghost" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/transition`, { action: "start" })}>Mulai trip</button> : null}
                  {trip.viewerRole === "host" && trip.status === "ONGOING" ? <button type="button" className="btn-primary" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/transition`, { action: "complete" })}>Selesai</button> : null}
                  {trip.viewerRole === "host" && trip.status === "COMPLETED" ? (
                    <button type="button" className="btn-primary" disabled={pending} onClick={() => void act(`/api/v1/trips/${trip.id}/publish-as-template`, {})}>
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
              </>
            ) : null}
            {trip.status === "COMPLETED" && (trip.viewerRole === "host" || trip.viewerRole === "participant") ? (
              <AttendanceConfirm tripId={trip.id} tripTitle={trip.title} reviewUsername={trip.viewerRole === "participant" ? trip.host.username : null} />
            ) : null}
          </aside>
        </div>
      </div>

      {joinCta === "none" && !cancelled && !full ? (
        <div className="fixed inset-x-0 bottom-14 z-40 border-t border-slate-200 bg-white/95 p-3 pb-safe shadow-[0_-8px_28px_rgba(7,28,50,.12)] backdrop-blur-xl md:hidden">
          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff8a3d] py-3 text-sm font-bold text-white" onClick={() => setJoinModal(true)}>
            Ajukan Join Trip
          </button>
        </div>
      ) : null}

      {joinModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="join-modal-title">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <button type="button" className="absolute right-5 top-5 rounded-lg p-1 text-on-surface-variant hover:bg-slate-100" onClick={() => setJoinModal(false)} aria-label="Tutup">
              <Icon name="close" className="text-[20px]" />
            </button>
            <span className="rounded-full border border-primary/20 bg-primary-fixed px-2.5 py-1 text-xs font-bold text-primary">Pengajuan rekan jalan</span>
            <h2 id="join-modal-title" className="mt-2 text-lg font-bold">Formulir ajukan join trip</h2>
            <p className="text-xs text-on-surface-variant">Trip: <strong>{trip.title}</strong></p>
            <form className="mt-4 space-y-4" onSubmit={onJoin}>
              <label className="block text-xs font-bold text-on-surface">Perkenalan & alasan ikut
                <textarea className="field-input mt-1 min-h-24 text-xs" required value={joinMessage} onChange={(event) => setJoinMessage(event.target.value)} placeholder="Contoh: Halo, saya solo traveler. Hobi foto landscape dan siap patungan tepat waktu…" />
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                <input className="mt-0.5" type="checkbox" checked={joinAck} onChange={(event) => setJoinAck(event.target.checked)} required />
                <span className="text-[11px] leading-snug text-amber-900">Saya memahami bahwa trip ini adalah <strong>kegiatan swadaya mandiri (bukan paket tur)</strong> dan saya berkomitmen menanggung pengeluaran logistik pribadi sekitar <strong>~Rp {perPerson.toLocaleString("id-ID")}</strong>.</span>
              </label>
              {error ? <p className="rounded-xl bg-error-container px-3 py-2.5 text-xs text-on-error-container" role="alert">{error}</p> : null}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" className="rounded-xl px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-slate-100" onClick={() => setJoinModal(false)}>Batal</button>
                <button type="submit" className="rounded-xl bg-[#ff8a3d] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#ea580c] disabled:opacity-60" disabled={pending}>{pending ? "Mengirim…" : "Kirim pengajuan ke host"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LogisticCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
      <span className="block text-[11px] font-semibold uppercase text-on-surface-variant">{label}</span>
      <span className="mt-0.5 block text-sm font-bold text-on-surface">{value}</span>
      <span className="text-[11px] text-on-surface-variant">{hint}</span>
    </div>
  );
}

function ClosedJoin({ title, body, action }: { title: string; body: string; action: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 text-center">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">Status trip</span>
        <span className="block text-sm font-extrabold text-on-surface">{title}</span>
        <p className="mt-1 text-[11px] text-on-surface-variant">{body}</p>
      </div>
      <button type="button" className="w-full cursor-not-allowed rounded-xl bg-slate-200 py-3 text-xs font-bold text-slate-400" disabled>{action}</button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { ApiError, ChatMessage, PublicUser, TripDetail } from "@/lib/contracts";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { LocationSharePanel } from "@/components/trip/LocationSharePanel";
import { ROUTES } from "@/lib/routes";
import { connectDolanSocket } from "@/lib/realtime/dolan-socket";
import { destinationCoverUrl } from "@/lib/destination-itinerary";

type ChatState = "connecting" | "online" | "offline";

const NEAR_BOTTOM_PX = 96;

function mergeMessages(current: ChatMessage[], incoming: ChatMessage) {
  const index = current.findIndex((item) => item.id === incoming.id || item.clientMessageId === incoming.clientMessageId);
  if (index < 0) return [...current, incoming];
  const next = [...current]; next[index] = incoming; return next;
}

function mergeMessageList(current: ChatMessage[], incoming: ChatMessage[]) {
  return incoming.reduce((all, message) => mergeMessages(all, message), current);
}

function parseMessagesPayload(data: ChatMessage[] | { messages: ChatMessage[] }) {
  return Array.isArray(data) ? data : data.messages;
}

function isOwnMessage(message: ChatMessage, me: PublicUser | null, trip: TripDetail | null) {
  if (me?.id && message.sender.id === me.id) return true;
  if (me?.username && message.sender.username === me.username) return true;
  return Boolean(trip?.viewerRole === "host" && message.sender.id === trip.host.id);
}

function formatMessageTime(sentAt: string) {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(sentAt));
}

export function TripChatRoom({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [state, setState] = useState<ChatState>("connecting");
  const [error, setError] = useState("");
  const [me, setMe] = useState<PublicUser | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);
  const hasJoinedOnceRef = useRef(false);

  useEffect(() => {
    lastMessageIdRef.current = messages.at(-1)?.id ?? null;
  }, [messages]);

  useEffect(() => {
    const controller = new AbortController();
    async function hydrate() {
      const [tripResponse, messageResponse, meResponse] = await Promise.all([
        fetch(`/api/v1/trips/${tripId}`, { credentials: "include", signal: controller.signal }),
        fetch(`/api/v1/trips/${tripId}/messages?limit=50`, { credentials: "include", signal: controller.signal }),
        fetch("/api/v1/users/me", { credentials: "include", signal: controller.signal }),
      ]);
      const tripPayload = await tripResponse.json() as { success: true; data: TripDetail } | ApiError;
      const messagePayload = await messageResponse.json() as { success: true; data: ChatMessage[] | { messages: ChatMessage[] } } | ApiError;
      if (!tripPayload.success) throw new Error(tripPayload.error.message);
      if (!messagePayload.success) throw new Error(messagePayload.error.message);
      setTrip(tripPayload.data);
      if (meResponse.ok) {
        const mePayload = await meResponse.json() as { success?: boolean; data?: { user?: PublicUser } };
        if (mePayload.success && mePayload.data?.user) setMe(mePayload.data.user);
      }
      setMessages(parseMessagesPayload(messagePayload.data));
    }
    void hydrate().catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Chat tidak dapat dimuat"); });
    return () => controller.abort();
  }, [tripId]);

  useEffect(() => {
    hasJoinedOnceRef.current = false;
    const socket = connectDolanSocket();
    socketRef.current = socket;

    async function refetchAfterReconnect() {
      const after = lastMessageIdRef.current;
      if (!after) return;
      try {
        const response = await fetch(`/api/v1/trips/${tripId}/messages?after=${encodeURIComponent(after)}&limit=50`, {
          credentials: "include",
        });
        const payload = await response.json() as { success: true; data: ChatMessage[] | { messages: ChatMessage[] } } | ApiError;
        if (!payload.success) return;
        const next = parseMessagesPayload(payload.data);
        if (next.length) setMessages((current) => mergeMessageList(current, next));
      } catch {
        // Keep the live socket stream; REST catch-up is best-effort.
      }
    }

    socket.on("connect", () => {
      setState("connecting");
      socket.emit("room.join", { tripId }, (result: { ok?: boolean; code?: string }) => {
        if (!result.ok) {
          setState("offline");
          setError(result.code ?? "Tidak dapat masuk room");
          return;
        }
        setState("online");
        if (hasJoinedOnceRef.current) void refetchAfterReconnect();
        hasJoinedOnceRef.current = true;
      });
    });
    socket.on("disconnect", () => setState("offline"));
    socket.on("connect_error", () => setState("offline"));
    socket.on("message.created", (message: ChatMessage) => setMessages((current) => mergeMessages(current, message)));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [tripId]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function onListScroll() {
    const list = listRef.current;
    if (!list) return;
    stickToBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight <= NEAR_BOTTOM_PX;
  }

  const canChat = trip?.viewerRole === "host" || trip?.viewerRole === "participant";
  const statusLabel = useMemo(() => state === "online" ? "Terhubung" : state === "connecting" ? "Menghubungkan…" : "Mencoba menyambung ulang…", [state]);
  const cover = destinationCoverUrl(trip?.destinationCity ?? "");
  const members = trip?.members?.length ? trip.members : trip ? [trip.host] : [];

  function send(event: React.FormEvent) {
    event.preventDefault();
    const content = body.trim(); if (!content || !canChat) return;
    const clientMessageId = crypto.randomUUID();
    const optimistic: ChatMessage = {
      id: clientMessageId,
      tripId,
      clientMessageId,
      body: content,
      sentAt: new Date().toISOString(),
      sender: me ?? trip!.host,
    };
    stickToBottomRef.current = true;
    setMessages((current) => mergeMessages(current, optimistic)); setBody(""); setError("");
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("message.send", { tripId, clientMessageId, body: content }, (result: { ok?: boolean; message?: ChatMessage; code?: string }) => {
        if (result.ok && result.message) setMessages((current) => mergeMessages(current, result.message!)); else setError(result.code ?? "Pesan gagal dikirim");
      });
      return;
    }
    void fetch(`/api/v1/trips/${tripId}/messages`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientMessageId, body: content }) })
      .then(async (response) => { const payload = await response.json() as { success: true; data: ChatMessage } | ApiError; if (!payload.success) throw new Error(payload.error.message); setMessages((current) => mergeMessages(current, payload.data)); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Pesan gagal dikirim"));
  }

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-[#071c32] px-0 py-0 md:px-margin-desktop md:py-8">
      <section className="mx-auto grid h-[100dvh] max-w-6xl overflow-hidden bg-[#f4f8fc] md:h-[calc(100dvh-8rem)] md:rounded-[2rem] md:border md:border-white/10 md:shadow-2xl md:grid-cols-[280px_1fr]">
        <aside className="hidden min-h-0 space-y-4 overflow-y-auto border-r border-sky-100 bg-white p-5 md:block">
          <Link href={ROUTES.trip(tripId)} className="inline-flex items-center gap-2 text-sm font-bold text-primary">
            <Icon name="arrow_back" /> Detail trip
          </Link>
          <div className="overflow-hidden rounded-[1.5rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="h-36 w-full object-cover" />
            <div className="bg-gradient-to-br from-primary to-[#1397d4] p-5 text-white">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70">Room chat grup trip</p>
              <h1 className="mt-2 text-xl font-extrabold">{trip?.title ?? "Memuat trip…"}</h1>
              <p className="mt-2 text-xs leading-5 text-white/80">{trip?.destinationCity}</p>
            </div>
          </div>
          <div className="flex -space-x-2">
            {members.slice(0, 6).map((member) => (
              <UserAvatar key={member.id} src={member.avatarUrl} alt={member.displayName} className="h-9 w-9 rounded-full border-2 border-white" iconClassName="text-[14px]" />
            ))}
          </div>
          <p className="text-xs leading-5 text-on-surface-variant">Chat hanya dapat dibaca host dan peserta yang sudah diterima.</p>
          {canChat ? <LocationSharePanel tripId={tripId} /> : null}
        </aside>
        <div className="flex min-h-0 flex-col">
          <header className="relative overflow-hidden border-b border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 md:hidden" />
            <div className="relative flex items-center gap-3 bg-[#071c32]/80 px-4 py-3 text-white backdrop-blur-md md:bg-white md:text-on-surface md:backdrop-blur-0">
              <Link href={ROUTES.trip(tripId)} className="grid h-10 w-10 place-items-center rounded-full bg-white/15 md:hidden">
                <Icon name="arrow_back" />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-extrabold">{trip?.title ?? "Grup perjalanan"}</h1>
                <p className="text-xs text-white/70 md:text-on-surface-variant">
                  <span className={`mr-1 inline-block h-2 w-2 rounded-full ${state === "online" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {statusLabel}
                </p>
              </div>
              <div className="hidden items-center -space-x-2 sm:flex">
                {members.slice(0, 4).map((member) => (
                  <UserAvatar key={member.id} src={member.avatarUrl} alt={member.displayName} className="h-8 w-8 rounded-full border-2 border-white" iconClassName="text-[12px]" />
                ))}
              </div>
            </div>
          </header>
          <div ref={listRef} onScroll={onListScroll} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[linear-gradient(180deg,#e8f3fb_0%,#f7fbff_48%,#eef6fb_100%)] p-4 md:p-6">
            {error ? <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{error}</p> : null}
            {messages.map((message) => {
              const mine = isOwnMessage(message, me, trip);
              return (
                <article key={message.id} className={`flex max-w-[86%] items-end gap-2 ${mine ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                  {mine ? null : (
                    <UserAvatar
                      src={message.sender.avatarUrl}
                      alt={message.sender.displayName}
                      className="mb-0.5 h-8 w-8 shrink-0 rounded-full"
                      iconClassName="text-[16px]"
                    />
                  )}
                  <div className={`min-w-0 px-4 py-3 shadow-sm ${mine ? "rounded-[1.25rem] rounded-br-md bg-primary text-white" : "rounded-[1.25rem] rounded-bl-md bg-white text-on-surface"}`}>
                    {mine ? null : <p className="text-[11px] font-extrabold text-primary">{message.sender.displayName}</p>}
                    <p className={`text-sm leading-6 ${mine ? "" : "mt-0.5"}`}>{message.body}</p>
                    <time className={`mt-1 block text-[10px] ${mine ? "text-right text-white/70" : "text-on-surface-variant"}`}>{formatMessageTime(message.sentAt)}</time>
                  </div>
                </article>
              );
            })}
          </div>
          <form onSubmit={send} className="flex items-center gap-2 border-t border-sky-100 bg-white p-3 md:p-4">
            <input className="field-input min-w-0 flex-1 !rounded-full !bg-slate-50" value={body} onChange={(event) => setBody(event.target.value)} placeholder={canChat ? "Tulis pesan ke grup trip…" : "Khusus anggota trip"} disabled={!canChat} />
            <button className="grid h-12 w-12 flex-none place-items-center rounded-full bg-primary text-white disabled:opacity-40" disabled={!canChat || !body.trim()} aria-label="Kirim pesan">
              <Icon name="send" filled />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

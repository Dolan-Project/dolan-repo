"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { ApiError, ChatMessage, PublicUser, TripDetail } from "@/lib/contracts";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { connectDolanSocket } from "@/lib/realtime/dolan-socket";
import { chatConnectErrorText, chatErrorText, chatStatusLabel, type ChatLinkState } from "@/lib/realtime/chat-status";
import { groupMessagesByDay, startsNewBurst, displayInitials } from "@/lib/realtime/chat-format";
import { TripChatShell } from "./TripChatShell";

const NEAR_BOTTOM_PX = 96;
const OFFLINE_GRACE_MS = 1600;

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
  const [state, setState] = useState<ChatLinkState>("connecting");
  const [everOnline, setEverOnline] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<PublicUser | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);
  const hasJoinedOnceRef = useRef(false);
  const offlineTimerRef = useRef<number | undefined>(undefined);

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
      if (!tripPayload.success) throw new Error(chatErrorText(tripPayload.error.code, tripPayload.error.message));
      setTrip(tripPayload.data);
      if (meResponse.ok) {
        const mePayload = await meResponse.json() as { success?: boolean; data?: { user?: PublicUser } };
        if (mePayload.success && mePayload.data?.user) setMe(mePayload.data.user);
      }
      if (!messagePayload.success) {
        setError(chatErrorText(messagePayload.error.code, messagePayload.error.message));
        return;
      }
      setError("");
      setMessages(parseMessagesPayload(messagePayload.data));
    }
    void hydrate().catch((reason) => {
      if (!controller.signal.aborted) setError(chatErrorText(reason instanceof Error ? reason.message : "", "Chat tidak dapat dimuat"));
    });
    return () => controller.abort();
  }, [tripId]);

  useEffect(() => {
    hasJoinedOnceRef.current = false;
    setEverOnline(false);
    setState("connecting");
    const socket = connectDolanSocket();
    socketRef.current = socket;

    function markOnline() {
      window.clearTimeout(offlineTimerRef.current);
      setState("online");
      setEverOnline(true);
    }

    function markOfflineSoon() {
      window.clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = window.setTimeout(() => setState("offline"), OFFLINE_GRACE_MS);
    }

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

    function joinRoom() {
      socket.emit("room.join", { tripId }, (result: { ok?: boolean; code?: string }) => {
        if (!result?.ok) {
          setState("offline");
          if (result?.code) setError(chatErrorText(result.code));
          return;
        }
        markOnline();
        if (hasJoinedOnceRef.current) void refetchAfterReconnect();
        hasJoinedOnceRef.current = true;
      });
    }

    const onConnect = () => joinRoom();
    const onDisconnect = () => markOfflineSoon();
    const onConnectError = (reason: Error) => {
      const text = chatConnectErrorText(reason.message);
      if (text) setError(text);
      markOfflineSoon();
    };
    const onMessage = (message: ChatMessage) => setMessages((current) => mergeMessages(current, message));

    if (socket.connected) joinRoom();
    else if (socket.disconnected) socket.connect();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("message.created", onMessage);
    const onTripDeleted = (payload: { tripId?: string }) => {
      if (payload?.tripId && payload.tripId !== tripId) return;
      setError("Host menghapus trip ini. Grup chat sudah ditutup.");
      setState("offline");
      window.setTimeout(() => {
        window.location.href = "/chat";
      }, 1200);
    };
    socket.on("trip.deleted", onTripDeleted);

    return () => {
      window.clearTimeout(offlineTimerRef.current);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("message.created", onMessage);
      socket.off("trip.deleted", onTripDeleted);
      socketRef.current = null;
    };
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
  const statusLabel = useMemo(() => chatStatusLabel(state, everOnline), [state, everOnline]);
  const dayGroups = useMemo(() => groupMessagesByDay(messages), [messages]);

  function send(event: { preventDefault: () => void }) {
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
    const socket = socketRef.current ?? connectDolanSocket();
    socketRef.current = socket;
    if (socket.connected) {
      socket.emit("message.send", { tripId, clientMessageId, body: content }, (result: { ok?: boolean; message?: ChatMessage; code?: string }) => {
        if (result.ok && result.message) setMessages((current) => mergeMessages(current, result.message!));
        else setError(chatErrorText(result.code, "Pesan gagal dikirim"));
      });
      return;
    }
    void fetch(`/api/v1/trips/${tripId}/messages`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientMessageId, body: content }) })
      .then(async (response) => {
        const payload = await response.json() as { success: true; data: ChatMessage } | ApiError;
        if (!payload.success) throw new Error(chatErrorText(payload.error.code, payload.error.message));
        setMessages((current) => mergeMessages(current, payload.data));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Pesan gagal dikirim"));
  }

  return (
    <TripChatShell activeTripId={tripId} trip={trip} viewer={me} statusLabel={statusLabel} linkState={state}>
      {trip?.publicMeetingPointLabel || trip?.meetingPoint ? (
        <PinnedMeetingPoint label={trip.publicMeetingPointLabel || trip.meetingPoint || ""} />
      ) : null}
      <div
        ref={listRef}
        onScroll={onListScroll}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-surface-bright to-surface-container-low/30 px-3 py-4 md:px-4"
      >
        {error ? (
          <p className="mx-auto mb-1 flex max-w-lg items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            <Icon name="info" className="text-[18px]" />
            {error}
          </p>
        ) : null}

        {!error && messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-sm rounded-xl bg-white px-6 py-8 text-center shadow-sm">
            <Icon name="forum" className="text-[32px] text-primary/50" />
            <p className="mt-2 text-sm font-extrabold">Belum ada pesan</p>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">Mulai obrolan soal jam kumpul, rute, atau titik meeting point.</p>
          </div>
        ) : null}

        {dayGroups.map((group) => (
          <section key={group.key} className="space-y-3">
            <p className="mx-auto w-fit rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-bold text-on-surface-variant shadow-sm">
              {group.label}
            </p>
            {group.messages.map((message, index) => {
              const mine = isOwnMessage(message, me, trip);
              const fresh = startsNewBurst(group.messages[index - 1], message);
              const hostMessage = Boolean(trip && message.sender.id === trip.host.id);
              return (
                <article
                  key={message.id}
                  className={`flex max-w-[88%] items-start gap-3 ${mine ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  {fresh ? (
                    <span className="relative mt-5 shrink-0">
                      {message.sender.avatarUrl ? (
                        <UserAvatar
                          src={message.sender.avatarUrl}
                          alt={message.sender.displayName}
                          className="h-9 w-9 rounded-full shadow-sm"
                          iconClassName="text-[16px]"
                        />
                      ) : (
                        <span
                          className={`grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold shadow-sm ${
                            mine || hostMessage ? "bg-primary text-white" : "bg-tertiary text-white"
                          }`}
                        >
                          {displayInitials(message.sender.displayName)}
                        </span>
                      )}
                      {hostMessage ? (
                        <span className="absolute -bottom-0.5 -right-0.5 grid h-3 w-3 place-items-center rounded-full bg-secondary text-[8px] text-white">
                          ★
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="w-9 shrink-0" />
                  )}
                  <div className={`flex min-w-0 flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                    {fresh ? (
                      <p className={`flex flex-wrap items-baseline gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                        <span className="text-sm font-extrabold text-on-surface">{mine ? "Kamu" : message.sender.displayName}</span>
                        {hostMessage && !mine ? (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">Host inisiator</span>
                        ) : null}
                        <time className="text-[11px] text-on-surface-variant">{formatMessageTime(message.sentAt)}</time>
                      </p>
                    ) : null}
                    <div
                      className={`px-3.5 py-3 text-sm leading-[22px] shadow-sm ${
                        mine
                          ? "rounded-2xl rounded-tr-sm bg-primary text-white shadow-md"
                          : "rounded-2xl rounded-tl-sm bg-white text-on-surface"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </div>
      <form onSubmit={send} className="shrink-0 bg-white p-3 shadow-[0_-4px_16px_rgba(0,74,198,.04)] md:p-4">
        <div className="flex items-end gap-2 rounded-2xl bg-surface-container-low p-2 focus-within:ring-2 focus-within:ring-primary/20">
          <textarea
            rows={1}
            className="max-h-24 min-h-[36px] min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(event);
              }
            }}
            placeholder={canChat ? "Tulis pesan atau koordinasi untuk rombongan…" : "Khusus anggota trip"}
            disabled={!canChat}
          />
          <button
            className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-gradient-to-tr from-secondary to-secondary-container text-white shadow-sm transition hover:shadow-md disabled:opacity-40 disabled:shadow-none"
            disabled={!canChat || !body.trim()}
            aria-label="Kirim pesan"
          >
            <Icon name="send" filled />
          </button>
        </div>
        <p className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-on-surface-variant">
          <span>
            Tekan <strong>Enter</strong> untuk kirim, <strong>Shift + Enter</strong> untuk baris baru
          </span>
          <span className={`inline-flex items-center gap-1 font-semibold ${state === "online" ? "text-emerald-600" : ""}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${state === "online" ? "bg-emerald-500" : "bg-outline"}`} />
            {statusLabel}
          </span>
        </p>
      </form>
    </TripChatShell>
  );
}

function PinnedMeetingPoint({ label }: { label: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="mx-3 mt-3 flex items-start gap-3 rounded-xl bg-secondary-fixed/50 p-3 shadow-sm md:mx-4">
      <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-secondary text-white">
        <Icon name="location_on" className="text-[18px]" filled />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-on-secondary-fixed">
          Pengumuman host trip
          <button type="button" onClick={() => setOpen(false)} className="text-on-secondary-fixed/70 hover:text-on-secondary-fixed" aria-label="Tutup pengumuman">
            <Icon name="close" className="text-[16px]" />
          </button>
        </p>
        <p className="mt-0.5 text-sm text-on-secondary-fixed">
          Titik kumpul: <strong>{label}</strong>
        </p>
      </div>
    </div>
  );
}

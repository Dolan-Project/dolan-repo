"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ApiError, ChatMessage, PublicUser, TripDetail } from "@/lib/contracts";
import { Icon } from "@/components/ui/Icon";
import { LocationSharePanel } from "@/components/trip/LocationSharePanel";
import { ROUTES } from "@/lib/routes";
import { TripChatInbox } from "./TripChatInbox";

type ChatState = "connecting" | "online" | "offline";

const NEAR_BOTTOM_PX = 96;

function mergeMessages(current: ChatMessage[], incoming: ChatMessage) {
  const index = current.findIndex((item) => item.id === incoming.id || item.clientMessageId === incoming.clientMessageId);
  if (index < 0) return [...current, incoming];
  const next = [...current];
  next[index] = incoming;
  return next;
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function MemberAvatar({ member, size = "md" }: { member: PublicUser; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-8 w-8 text-[10px]" : "h-11 w-11 text-sm";
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary font-extrabold text-white ${box}`}>
      {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(member.displayName)}
    </span>
  );
}

function mergeMessageList(current: ChatMessage[], incoming: ChatMessage[]) {
  return incoming.reduce((all, message) => mergeMessages(all, message), current);
}

function parseMessagesPayload(data: ChatMessage[] | { messages: ChatMessage[] }) {
  return Array.isArray(data) ? data : data.messages;
}

export function TripChatRoom({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [state, setState] = useState<ChatState>("connecting");
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [myUsername, setMyUsername] = useState("");
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
      const [tripResponse, messageResponse] = await Promise.all([
        fetch(`/api/v1/trips/${tripId}`, { credentials: "include", signal: controller.signal }),
        fetch(`/api/v1/trips/${tripId}/messages?limit=50`, { credentials: "include", signal: controller.signal }),
      ]);
      const tripPayload = await tripResponse.json() as { success: true; data: TripDetail } | ApiError;
      const messagePayload = await messageResponse.json() as { success: true; data: ChatMessage[] | { messages: ChatMessage[] } } | ApiError;
      if (!tripPayload.success) throw new Error(tripPayload.error.message);
      if (!messagePayload.success) throw new Error(messagePayload.error.message);
      setTrip(tripPayload.data);
      setMessages(parseMessagesPayload(messagePayload.data));
    }
    void hydrate().catch((reason) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Chat tidak dapat dimuat");
    });
    return () => controller.abort();
  }, [tripId]);

  useEffect(() => {
    hasJoinedOnceRef.current = false;
    const origin = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
    const socket = io(origin, { withCredentials: true, transports: ["websocket", "polling"], reconnection: true });
    socketRef.current = socket;
<<<<<<< HEAD

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
=======
    socket.on("connect", () => {
      setState("connecting");
      socket.emit("room.join", { tripId }, (result: { ok?: boolean; code?: string }) => (
        result.ok ? setState("online") : (setState("offline"), setError(result.code ?? "Tidak dapat masuk room"))
      ));
>>>>>>> 13c57bd (style: redesign edit page)
    });
    socket.on("disconnect", () => setState("offline"));
    socket.on("connect_error", () => setState("offline"));
    socket.on("message.created", (message: ChatMessage) => setMessages((current) => mergeMessages(current, message)));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tripId]);

  useEffect(() => {
<<<<<<< HEAD
    if (!stickToBottomRef.current) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function onListScroll() {
    const list = listRef.current;
    if (!list) return;
    stickToBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight <= NEAR_BOTTOM_PX;
  }

=======
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    void fetch("/api/v1/users/me", { credentials: "include" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload: { data?: { user?: { username?: string } } } | null) => {
        if (payload?.data?.user?.username) setMyUsername(payload.data.user.username);
      })
      .catch(() => undefined);
  }, []);

  const statusLabel = useMemo(
    () => (state === "online" ? "Terhubung" : state === "connecting" ? "Menghubungkan…" : "Mencoba menyambung ulang…"),
    [state],
  );
  const mine = (message: ChatMessage) => Boolean(myUsername) && message.sender.username === myUsername;
>>>>>>> 13c57bd (style: redesign edit page)
  const canChat = trip?.viewerRole === "host" || trip?.viewerRole === "participant";
  const members = useMemo(() => {
    if (!trip) return [];
    const list = trip.members?.length ? trip.members : [trip.host];
    const unique = list.filter((member, index, all) => all.findIndex((item) => item.id === member.id) === index);
    return unique.sort((left, right) => Number(right.id === trip.host.id) - Number(left.id === trip.host.id));
  }, [trip]);
  const groupedMessages = useMemo(() => {
    const groups: Array<{ label: string; items: ChatMessage[] }> = [];
    messages.forEach((message) => {
      const label = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(new Date(message.sentAt));
      const last = groups.at(-1);
      if (last?.label === label) last.items.push(message);
      else groups.push({ label, items: [message] });
    });
    return groups;
  }, [messages]);

  function send(event: React.FormEvent) {
    event.preventDefault();
    const content = body.trim();
    if (!content || !canChat || !trip) return;
    const clientMessageId = crypto.randomUUID();
<<<<<<< HEAD
    const optimistic: ChatMessage = { id: clientMessageId, tripId, clientMessageId, body: content, sentAt: new Date().toISOString(), sender: trip!.host };
    stickToBottomRef.current = true;
    setMessages((current) => mergeMessages(current, optimistic)); setBody(""); setError("");
=======
    const optimistic: ChatMessage = {
      id: clientMessageId,
      tripId,
      clientMessageId,
      body: content,
      sentAt: new Date().toISOString(),
      sender: trip.host,
    };
    setMessages((current) => mergeMessages(current, optimistic));
    setBody("");
    setError("");
>>>>>>> 13c57bd (style: redesign edit page)
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("message.send", { tripId, clientMessageId, body: content }, (result: { ok?: boolean; message?: ChatMessage; code?: string }) => {
        if (result.ok && result.message) setMessages((current) => mergeMessages(current, result.message!));
        else setError(result.code ?? "Pesan gagal dikirim");
      });
      return;
    }
    void fetch(`/api/v1/trips/${tripId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientMessageId, body: content }),
    })
      .then(async (response) => {
        const payload = await response.json() as { success: true; data: ChatMessage } | ApiError;
        if (!payload.success) throw new Error(payload.error.message);
        setMessages((current) => mergeMessages(current, payload.data));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Pesan gagal dikirim"));
  }

<<<<<<< HEAD
  return <main className="min-h-[calc(100dvh-5rem)] bg-surface px-margin py-5 md:px-margin-desktop md:py-8"><section className="mx-auto grid h-[calc(100dvh-8rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-outline-variant/50 bg-white shadow-xl md:grid-cols-[280px_1fr]">
    <aside className="hidden min-h-0 space-y-4 overflow-y-auto border-r border-outline-variant/45 bg-surface-container-low p-5 md:block"><Link href={ROUTES.trip(tripId)} className="inline-flex items-center gap-2 text-sm font-bold text-primary"><Icon name="arrow_back" /> Detail trip</Link><div className="rounded-2xl bg-gradient-to-br from-primary to-[#1397d4] p-5 text-white"><p className="text-xs font-bold text-white/70">ROOM TRIP</p><h1 className="mt-2 text-xl font-extrabold">{trip?.title ?? "Memuat trip…"}</h1><p className="mt-3 text-xs leading-5 text-white/80">{trip?.destinationCity}</p></div><p className="text-xs leading-5 text-on-surface-variant">Chat hanya dapat dibaca host dan peserta yang sudah diterima.</p>{canChat ? <LocationSharePanel tripId={tripId} /> : null}</aside>
    <div className="flex min-h-0 flex-col"><header className="flex items-center gap-3 border-b border-outline-variant/45 px-4 py-3 md:px-6"><Link href={ROUTES.trip(tripId)} className="grid h-10 w-10 place-items-center rounded-full bg-surface-container md:hidden"><Icon name="arrow_back" /></Link><div className="min-w-0 flex-1"><h1 className="truncate font-extrabold text-on-surface">{trip?.title ?? "Grup perjalanan"}</h1><p className="text-xs text-on-surface-variant"><span className={`mr-1 inline-block h-2 w-2 rounded-full ${state === "online" ? "bg-emerald-500" : "bg-amber-500"}`} />{statusLabel}</p></div></header>
      <div ref={listRef} onScroll={onListScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f4f8fc] p-4 md:p-6">{error ? <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{error}</p> : null}{messages.map((message) => <article key={message.id} className="max-w-[82%] rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm"><p className="text-xs font-extrabold text-primary">@{message.sender.username}</p><p className="mt-1 text-sm leading-6 text-on-surface">{message.body}</p><time className="mt-1 block text-[10px] text-on-surface-variant">{new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.sentAt))}</time></article>)}</div>
      <form onSubmit={send} className="flex gap-2 border-t border-outline-variant/45 bg-white p-3 md:p-4"><input className="field-input min-w-0 flex-1 !rounded-full" value={body} onChange={(event) => setBody(event.target.value)} placeholder={canChat ? "Tulis pesan…" : "Khusus anggota trip"} disabled={!canChat}/><button className="grid h-12 w-12 flex-none place-items-center rounded-full bg-primary text-white disabled:opacity-40" disabled={!canChat || !body.trim()} aria-label="Kirim pesan"><Icon name="send" filled /></button></form>
=======
  const memberPanel = (
    <>
      <div className="mb-4 flex items-center justify-between border-b border-sky-100 pb-4 xl:mb-0 xl:border-b-0 xl:pb-0">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Anggota grup</p>
          <h2 className="mt-1 text-lg font-extrabold text-on-surface">{members.length} orang</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {trip?.destinationCity ?? "Trip grup"}
            {trip?.maxParticipants ? ` · ${members.length}/${trip.maxParticipants}` : ""}
          </p>
        </div>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container xl:hidden" onClick={() => setInfoOpen(false)} aria-label="Tutup">
          <Icon name="close" />
        </button>
      </div>
      <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {members.length === 0 ? (
          <li className="rounded-2xl bg-surface-container-low px-3 py-4 text-sm text-on-surface-variant">Anggota belum dimuat.</li>
        ) : members.map((member) => {
          const host = member.id === trip?.host.id;
          return (
            <li key={member.id}>
              <Link
                href={ROUTES.profilUser(member.username)}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${host ? "bg-primary-fixed/70" : "hover:bg-surface-container-low"}`}
              >
                <MemberAvatar member={member} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-extrabold text-on-surface">{member.displayName}</span>
                    {host ? <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-white">Host</span> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-on-surface-variant">
                    @{member.username}{member.domicile ? ` · ${member.domicile}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href={ROUTES.trip(tripId)} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-extrabold text-white">
        Buka detail trip
      </Link>
    </>
  );

  return (
    <div className="fixed inset-0 z-[60] grid bg-surface md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_300px]">
      <div className="hidden md:block">
        <TripChatInbox activeTripId={tripId} />
      </div>
      <section className="flex min-h-0 min-w-0 flex-col border-x border-sky-100 bg-white">
        <header className="flex items-center gap-3 border-b border-sky-100 bg-white px-3 py-3 md:px-4">
          <Link href={ROUTES.chats} className="grid h-10 w-10 place-items-center rounded-full text-primary hover:bg-surface-container md:hidden" aria-label="Semua chat">
            <Icon name="arrow_back" />
          </Link>
          <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-sm font-extrabold text-white">
            {(trip?.destinationCity ?? trip?.title ?? "TR").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold text-on-surface">{trip?.title ?? "Grup perjalanan"}</h1>
            <p className="truncate text-[11px] text-on-surface-variant">
              <span className={`mr-1 inline-block h-2 w-2 rounded-full ${state === "online" ? "bg-success" : "bg-secondary-container"}`} />
              {members.length} anggota · {statusLabel}
              {trip?.destinationCity ? ` · ${trip.destinationCity}` : ""}
            </p>
          </div>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-primary hover:bg-surface-container xl:hidden" onClick={() => setInfoOpen((open) => !open)} aria-label="Anggota grup">
            <Icon name="groups" />
          </button>
        </header>
        <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-surface px-3 py-4 md:px-6">
          {error ? <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{error}</p> : null}
          {groupedMessages.map((group) => (
            <div key={group.label} className="space-y-3">
              <p className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-[11px] font-bold capitalize text-on-surface-variant shadow-sm">{group.label}</p>
              {group.items.map((message) => {
                const own = mine(message);
                return (
                  <article key={message.id} className={`flex max-w-[86%] gap-2 ${own ? "ml-auto flex-row-reverse" : ""}`}>
                    <MemberAvatar member={message.sender} size="sm" />
                    <div className={`min-w-0 rounded-2xl px-3.5 py-2.5 shadow-sm ${own ? "rounded-tr-md bg-primary text-white" : "rounded-tl-md border border-sky-100 bg-white text-on-surface"}`}>
                      {own ? null : <p className="text-[11px] font-extrabold text-primary">{message.sender.displayName}</p>}
                      <p className="mt-0.5 text-sm leading-6">{message.body}</p>
                      <time className={`mt-1 block text-right text-[10px] ${own ? "text-white/70" : "text-on-surface-variant"}`}>
                        {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.sentAt))}
                      </time>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-sky-100 bg-white px-3 py-3 md:px-4">
          <input
            className="field-input min-w-0 flex-1 !rounded-full"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={canChat ? "Tulis pesan ke grup trip…" : "Khusus anggota trip"}
            disabled={!canChat}
          />
          <button className="grid h-12 w-12 flex-none place-items-center rounded-full bg-secondary-container text-white shadow-md disabled:opacity-40" disabled={!canChat || !body.trim()} aria-label="Kirim pesan">
            <Icon name="send" filled />
          </button>
        </form>
      </section>
      <aside className={`${infoOpen ? "fixed inset-0 z-[70] flex flex-col bg-white p-5 xl:static xl:flex" : "hidden xl:flex"} xl:flex-col xl:border-l xl:border-sky-100 xl:bg-white xl:p-5`}>
        {memberPanel}
      </aside>
>>>>>>> 13c57bd (style: redesign edit page)
    </div>
  );
}

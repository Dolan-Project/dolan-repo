"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ApiError, ChatMessage, TripDetail } from "@/lib/contracts";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

type ChatState = "connecting" | "online" | "offline";

function mergeMessages(current: ChatMessage[], incoming: ChatMessage) {
  const index = current.findIndex((item) => item.id === incoming.id || item.clientMessageId === incoming.clientMessageId);
  if (index < 0) return [...current, incoming];
  const next = [...current]; next[index] = incoming; return next;
}

export function TripChatRoom({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [state, setState] = useState<ChatState>("connecting");
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
      setMessages(Array.isArray(messagePayload.data) ? messagePayload.data : messagePayload.data.messages);
    }
    void hydrate().catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Chat tidak dapat dimuat"); });
    return () => controller.abort();
  }, [tripId]);

  useEffect(() => {
    const origin = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
    const socket = io(origin, { withCredentials: true, transports: ["websocket", "polling"], reconnection: true });
    socketRef.current = socket;
    socket.on("connect", () => { setState("connecting"); socket.emit("room.join", { tripId }, (result: { ok?: boolean; code?: string }) => result.ok ? setState("online") : (setState("offline"), setError(result.code ?? "Tidak dapat masuk room"))); });
    socket.on("disconnect", () => setState("offline"));
    socket.on("connect_error", () => setState("offline"));
    socket.on("message.created", (message: ChatMessage) => setMessages((current) => mergeMessages(current, message)));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [tripId]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);
  const canChat = trip?.viewerRole === "host" || trip?.viewerRole === "participant";
  const statusLabel = useMemo(() => state === "online" ? "Terhubung" : state === "connecting" ? "Menghubungkan…" : "Mencoba menyambung ulang…", [state]);

  function send(event: React.FormEvent) {
    event.preventDefault();
    const content = body.trim(); if (!content || !canChat) return;
    const clientMessageId = crypto.randomUUID();
    const optimistic: ChatMessage = { id: clientMessageId, tripId, clientMessageId, body: content, sentAt: new Date().toISOString(), sender: trip!.host };
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

  return <main className="min-h-[calc(100dvh-5rem)] bg-surface px-margin py-5 md:px-margin-desktop md:py-8"><section className="mx-auto grid h-[calc(100dvh-8rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-outline-variant/50 bg-white shadow-xl md:grid-cols-[280px_1fr]">
    <aside className="hidden border-r border-outline-variant/45 bg-surface-container-low p-5 md:block"><Link href={ROUTES.trip(tripId)} className="inline-flex items-center gap-2 text-sm font-bold text-primary"><Icon name="arrow_back" /> Detail trip</Link><div className="mt-8 rounded-2xl bg-gradient-to-br from-primary to-[#1397d4] p-5 text-white"><p className="text-xs font-bold text-white/70">ROOM TRIP</p><h1 className="mt-2 text-xl font-extrabold">{trip?.title ?? "Memuat trip…"}</h1><p className="mt-3 text-xs leading-5 text-white/80">{trip?.destinationCity}</p></div><p className="mt-5 text-xs leading-5 text-on-surface-variant">Chat hanya dapat dibaca host dan peserta yang sudah diterima.</p></aside>
    <div className="flex min-h-0 flex-col"><header className="flex items-center gap-3 border-b border-outline-variant/45 px-4 py-3 md:px-6"><Link href={ROUTES.trip(tripId)} className="grid h-10 w-10 place-items-center rounded-full bg-surface-container md:hidden"><Icon name="arrow_back" /></Link><div className="min-w-0 flex-1"><h1 className="truncate font-extrabold text-on-surface">{trip?.title ?? "Grup perjalanan"}</h1><p className="text-xs text-on-surface-variant"><span className={`mr-1 inline-block h-2 w-2 rounded-full ${state === "online" ? "bg-emerald-500" : "bg-amber-500"}`} />{statusLabel}</p></div></header>
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f4f8fc] p-4 md:p-6">{error ? <p className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">{error}</p> : null}{messages.map((message) => <article key={message.id} className="max-w-[82%] rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm"><p className="text-xs font-extrabold text-primary">@{message.sender.username}</p><p className="mt-1 text-sm leading-6 text-on-surface">{message.body}</p><time className="mt-1 block text-[10px] text-on-surface-variant">{new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.sentAt))}</time></article>)}</div>
      <form onSubmit={send} className="flex gap-2 border-t border-outline-variant/45 bg-white p-3 md:p-4"><input className="field-input min-w-0 flex-1 !rounded-full" value={body} onChange={(event) => setBody(event.target.value)} placeholder={canChat ? "Tulis pesan…" : "Khusus anggota trip"} disabled={!canChat}/><button className="grid h-12 w-12 flex-none place-items-center rounded-full bg-primary text-white disabled:opacity-40" disabled={!canChat || !body.trim()} aria-label="Kirim pesan"><Icon name="send" filled /></button></form>
    </div>
  </section></main>;
}

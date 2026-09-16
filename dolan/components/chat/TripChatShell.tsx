"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { DolanWordmark } from "@/components/brand/DolanWordmark";
import { TripCoverImage } from "@/components/trip/TripCoverImage";
import { ROUTES } from "@/lib/routes";
import type { PublicUser, TripDetail } from "@/lib/contracts";
import { displayInitials } from "@/lib/realtime/chat-format";
import { TripChatInbox } from "./TripChatInbox";

type MobilePane = "list" | "chat" | "members";

export function TripChatShell({
  activeTripId,
  trip,
  viewer,
  statusLabel,
  linkState,
  children,
}: {
  activeTripId?: string;
  trip?: TripDetail | null;
  viewer?: PublicUser | null;
  statusLabel?: string;
  linkState?: "connecting" | "online" | "offline";
  children?: ReactNode;
}) {
  const [mobilePane, setMobilePane] = useState<MobilePane>(activeTripId ? "chat" : "list");
  const members = trip?.members?.length ? trip.members : trip ? [trip.host] : [];

  useEffect(() => {
    setMobilePane(activeTripId ? "chat" : "list");
  }, [activeTripId]);

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col bg-surface text-on-surface md:top-16">
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-3 py-3 md:px-8 md:py-4">
        <nav className="mb-3 hidden shrink-0 flex-wrap items-center justify-between gap-2 lg:flex">
          <p className="flex items-center gap-1.5 text-sm text-on-surface-variant">
            <Link href={ROUTES.beranda} className="inline-flex items-center gap-1 hover:text-primary">
              <Icon name="home" className="text-[16px]" />
              Beranda
            </Link>
            <span>/</span>
            <Link href={ROUTES.chats} className="hover:text-primary">
              Chat &amp; Rombongan
            </Link>
            {trip ? (
              <>
                <span>/</span>
                <span className="font-bold text-primary">{trip.title}</span>
              </>
            ) : null}
          </p>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-2.5 py-1 text-[11px] font-bold text-on-secondary-fixed shadow-sm">
            <span
              className={`h-2 w-2 rounded-full ${linkState === "online" ? "bg-emerald-500" : "animate-pulse bg-secondary"}`}
            />
            {statusLabel ?? "Chat grup trip"}
            {trip?.destinationCity ? ` · ${trip.destinationCity}` : ""}
          </p>
        </nav>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          <aside
            className={`${mobilePane === "list" ? "flex" : "hidden"} min-h-0 flex-col lg:col-span-3 lg:flex`}
          >
            <TripChatInbox activeTripId={activeTripId} />
          </aside>

          <section
            className={`${mobilePane === "chat" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-6 lg:flex`}
          >
            {activeTripId ? (
              <>
                <ChatRoomHeader
                  trip={trip}
                  statusLabel={statusLabel}
                  linkState={linkState}
                  onBack={() => setMobilePane("list")}
                  onMembers={() => setMobilePane("members")}
                />
                {children}
              </>
            ) : (
              <div className="hidden min-h-0 flex-1 place-items-center bg-gradient-to-b from-surface-bright to-surface-container-low/40 p-8 text-center lg:grid">
                <div className="max-w-md">
                  <div className="mx-auto w-fit">
                    <DolanWordmark height={40} />
                  </div>
                  <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Room chat trip</p>
                  <h1 className="mt-2 text-2xl font-extrabold">Pilih percakapan di kiri</h1>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Setiap trip punya room-nya sendiri. Pilih grup untuk koordinasi rute, jam kumpul, dan update perjalanan.
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside
            className={`${mobilePane === "members" ? "flex" : "hidden"} min-h-0 flex-col lg:col-span-3 lg:flex`}
          >
            <ChatMembersPane
              trip={trip}
              members={members}
              viewer={viewer}
              onBack={() => setMobilePane(activeTripId ? "chat" : "list")}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function ChatRoomHeader({
  trip,
  statusLabel,
  linkState,
  onBack,
  onMembers,
}: {
  trip?: TripDetail | null;
  statusLabel?: string;
  linkState?: "connecting" | "online" | "offline";
  onBack: () => void;
  onMembers: () => void;
}) {
  const meeting = trip?.publicMeetingPointLabel || trip?.meetingPoint;

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-primary/5 p-3 md:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="grid h-10 w-10 flex-none place-items-center rounded-full text-primary hover:bg-surface-container-low lg:hidden"
            onClick={onBack}
            aria-label="Lihat daftar grup chat"
          >
            <Icon name="arrow_back" />
          </button>
          <span className="h-12 w-12 flex-none overflow-hidden rounded-xl bg-gradient-to-tr from-primary to-tertiary shadow-md">
            {trip ? (
              <TripCoverImage
                place={trip.coverPlace}
                destinationCity={trip.destinationCity}
                title={trip.title}
                className="h-full w-full"
              />
            ) : null}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold md:text-[18px]">{trip?.title ?? "Grup perjalanan"}</h1>
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-[11px] text-on-surface-variant">
              <span className="inline-flex items-center gap-1">
                <span
                  className={`h-2 w-2 rounded-full ${
                    linkState === "online" ? "bg-emerald-500" : "animate-pulse bg-secondary"
                  }`}
                />
                {statusLabel ?? "Chat grup trip"}
              </span>
              {trip?.destinationCity ? (
                <>
                  <span>•</span>
                  <span className="truncate">{trip.destinationCity}</span>
                </>
              ) : null}
              {trip?.activeParticipantCount ? (
                <>
                  <span>•</span>
                  <span>{trip.activeParticipantCount} orang</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {trip ? (
            <Link
              href={ROUTES.trip(trip.id)}
              className="hidden h-9 w-9 place-items-center rounded-full bg-surface-container-low text-primary hover:bg-surface-container-high lg:grid"
              aria-label="Buka detail trip"
              title="Buka detail trip"
            >
              <Icon name="info" />
            </Link>
          ) : null}
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container-high lg:hidden"
            onClick={onMembers}
            aria-label="Lihat anggota grup"
          >
            <Icon name="group" />
          </button>
        </div>
      </div>
      {trip ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={ROUTES.trip(trip.id)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
          >
            <Icon name="alt_route" className="text-[16px]" />
            Peta rute
          </Link>
          <Link
            href={ROUTES.trip(trip.id)}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-semibold text-on-surface hover:bg-surface-container-highest"
          >
            <Icon name="notes" className="text-[16px]" />
            Rundown
          </Link>
          {meeting ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-3 py-1 text-[11px] font-bold text-on-secondary-fixed">
              <Icon name="location_on" className="text-[16px]" filled />
              {meeting}
            </span>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

function ChatMembersPane({
  trip,
  members,
  viewer,
  onBack,
}: {
  trip?: TripDetail | null;
  members: PublicUser[];
  viewer?: PublicUser | null;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const host = trip?.host;
  const filled = members.length;
  const max = trip?.maxParticipants ?? null;
  const openSlots = max != null ? Math.max(0, max - filled) : null;
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id-ID");
    if (!needle) return members;
    return members.filter((member) =>
      `${member.displayName} ${member.username}`.toLocaleLowerCase("id-ID").includes(needle),
    );
  }, [members, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white p-3 shadow-sm md:p-4">
      <div className="flex shrink-0 items-start gap-2">
        <button
          type="button"
          className="grid h-10 w-10 flex-none place-items-center rounded-full text-primary hover:bg-surface-container-low lg:hidden"
          onClick={onBack}
          aria-label="Kembali ke chat"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold">Awak rombongan</h2>
          <p className="text-[12px] text-on-surface-variant">
            {trip ? (
              <>
                {filled}
                {max ? ` dari ${max}` : ""} kuota terisi
                {openSlots != null ? (
                  <>
                    {" "}
                    • <span className="font-bold text-secondary">{openSlots} slot terbuka</span>
                  </>
                ) : null}
              </>
            ) : (
              "Anggota"
            )}
          </p>
        </div>
      </div>

      {trip ? (
        <label className="relative mt-3 shrink-0">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant" />
          <span className="sr-only">Cari anggota</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama kawan rombongan…"
            className="w-full rounded-lg bg-white py-1.5 pl-8 pr-3 text-xs text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-1 focus:ring-primary/30 md:bg-surface-container-low"
          />
        </label>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {!trip || !host ? (
          <p className="px-1 py-6 text-sm leading-6 text-on-surface-variant">Pilih grup chat dulu untuk melihat anggotanya.</p>
        ) : visible.length === 0 ? (
          <p className="px-1 py-6 text-sm text-on-surface-variant">Tidak ada anggota yang cocok.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((member) => {
              const isHost = member.id === host.id;
              const isYou = viewer?.id === member.id;
              return (
                <li key={member.id}>
                  <Link
                    href={ROUTES.profilUser(member.username)}
                    className="flex items-center gap-2.5 rounded-xl bg-surface-container-low p-2.5 hover:bg-surface-container"
                  >
                    <span className="relative shrink-0">
                      {member.avatarUrl ? (
                        <UserAvatar
                          src={member.avatarUrl}
                          alt={member.displayName}
                          className="h-10 w-10 rounded-full"
                          iconClassName="text-[16px]"
                        />
                      ) : (
                        <span
                          className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${
                            isHost ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface"
                          }`}
                        >
                          {displayInitials(member.displayName)}
                        </span>
                      )}
                      {isHost ? (
                        <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-secondary text-[9px] font-bold text-white">
                          ★
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span className="truncate text-sm font-extrabold text-on-surface">{member.displayName}</span>
                        {isYou ? (
                          <span className="rounded bg-primary/15 px-1 text-[9px] font-bold text-primary">Anda</span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[11px] text-on-surface-variant">
                        {isHost ? "Host & inisiator" : member.domicile ? member.domicile : `@${member.username}`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-3 shrink-0 border-t border-primary/5 pt-3">
        {trip ? (
          <Link
            href={ROUTES.trip(trip.id)}
            className="group block overflow-hidden rounded-xl border border-primary/10 bg-surface-container-low transition hover:border-primary/30"
          >
            <span className="block h-20 overflow-hidden">
              <TripCoverImage
                place={trip.coverPlace}
                destinationCity={trip.destinationCity}
                title={trip.title}
                className="h-20 w-full"
              />
            </span>
            <span className="block p-3">
              <span className="block truncate text-sm font-extrabold">{trip.title}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-on-surface-variant">
                <Icon name="location_on" className="text-[14px]" filled />
                <span className="truncate">{trip.destinationCity || "Destinasi belum diisi"}</span>
              </span>
              <span className="mt-2 flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-white group-hover:bg-primary-container">
                Detail trip
                <Icon name="arrow_forward" className="text-[16px]" />
              </span>
            </span>
          </Link>
        ) : (
          <Link
            href={ROUTES.tripSaya}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container px-4 py-3 text-sm font-extrabold text-primary"
          >
            Ke Trip Saya
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        )}
      </div>
    </div>
  );
}

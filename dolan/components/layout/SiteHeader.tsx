"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthSession } from "@/lib/contracts";
import { ROUTES, type NavKey } from "@/lib/routes";
import { Icon } from "@/components/ui/Icon";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { DolanWordmark } from "@/components/brand/DolanWordmark";
import { UserAvatar } from "@/components/ui/UserAvatar";

const desktopLinks: { key: NavKey; href: string; label: string }[] = [
  { key: "beranda", href: ROUTES.beranda, label: "Beranda" },
  { key: "jelajah", href: ROUTES.jelajah, label: "Jelajah" },
  { key: "trip-saya", href: ROUTES.tripSaya, label: "Trip Saya" },
];

function isActive(pathname: string, key: NavKey) {
  if (key === "beranda") return pathname === "/";
  if (key === "jelajah")
    return (
      pathname.startsWith("/jelajah") ||
      pathname.startsWith("/wisata") ||
      pathname.startsWith("/itinerary") ||
      pathname.startsWith("/trip")
    );
  if (key === "trip-saya") return pathname.startsWith("/trip-saya");
  if (key === "buat-trip") return pathname.startsWith("/buat-trip");
  if (key === "profil") return pathname.startsWith("/profil");
  return false;
}

export function SiteHeader({
  session,
  unreadCount = 0,
}: {
  session: AuthSession | null;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const chatChrome = pathname === "/chat" || /\/trip\/[^/]+\/chat$/.test(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  if (chatChrome) return null;

  return (
    <header
      className={`fixed top-0 z-50 w-full border-b border-[#e8edf3] bg-white/94 backdrop-blur-xl ${
        scrolled ? "shadow-[0_8px_30px_rgba(15,59,94,.06)]" : ""
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 md:h-16 md:px-6">
        <Link href={ROUTES.beranda} className="flex shrink-0 items-center" aria-label="DOLAN beranda">
          <DolanWordmark height={32} />
        </Link>

        <form
          className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-[#e4e9f0] bg-[#f4f6f9] px-3.5 py-2 md:flex md:max-w-[22rem]"
          action={ROUTES.jelajah}
          onSubmit={(event) => {
            event.preventDefault();
            const next = query.trim();
            router.push(next ? `${ROUTES.jelajah}?q=${encodeURIComponent(next)}` : ROUTES.jelajah);
          }}
        >
          <Icon name="search" className="text-[18px] text-on-surface-variant" />
          <input
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent type-caption text-on-surface outline-none placeholder:text-on-surface-variant/80"
            placeholder="Cari destinasi, rute, atau kawan dolan..."
          />
        </form>

        <nav className="ml-auto hidden items-center gap-0.5 lg:flex">
          {desktopLinks.map((link) => {
            const active = isActive(pathname, link.key);
            return (
              <Link
                key={link.key}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "type-label rounded-full bg-primary/10 px-3 py-2 text-primary"
                    : "type-label rounded-full px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
                }
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href={`${ROUTES.jelajah}?tab=template`}
            className="type-label hidden rounded-full px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface xl:inline"
          >
            Rute Populer
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {session ? (
            <Link
              href={ROUTES.buatTrip}
              className="btn-primary !hidden !min-h-10 !gap-1 !px-4 !py-2 !text-[0.8125rem] md:!inline-flex"
            >
              <Icon name="add" className="text-[18px]" />
              Buat Trip
            </Link>
          ) : null}
          <NotificationBell session={session} unreadCount={unreadCount} />
          {session ? (
            <Link href={ROUTES.profil} aria-label="Profil">
              <UserAvatar
                src={session.user.avatarUrl}
                className="h-8 w-8 rounded-full ring-2 ring-primary-fixed"
                iconClassName="text-[18px]"
              />
            </Link>
          ) : (
            <>
              <Link href={ROUTES.masuk} className="hidden type-label text-on-surface-variant hover:text-on-surface sm:inline">
                Masuk
              </Link>
              <Link
                href={ROUTES.daftar}
                className="btn-primary !hidden !min-h-10 !px-5 !py-2 !text-[0.875rem] sm:!inline-flex"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

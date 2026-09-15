"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const chatChrome = pathname === "/chat" || /\/trip\/[^/]+\/chat$/.test(pathname);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 20);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const transparent = pathname === "/" && !scrolled;
  if (chatChrome) return null;

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-500 ${
        transparent
          ? "border-transparent bg-transparent shadow-none"
          : "border-b border-white/60 bg-white/82 shadow-[0_8px_30px_rgba(15,59,94,.08)] backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-3 px-margin md:h-16 md:px-margin-desktop lg:grid lg:grid-cols-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link href={ROUTES.beranda} className="flex items-center" aria-label="DOLAN beranda">
            <DolanWordmark height={34} className={transparent ? "rounded-lg bg-white/92 px-1" : ""} />
          </Link>

        </div>

        <nav className="hidden items-center justify-center gap-1 lg:flex">
          {desktopLinks.map((link) => {
            const active = isActive(pathname, link.key);
            return (
              <Link
                key={link.key}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={active ? "type-label rounded-full bg-surface-container-low px-3.5 py-2 text-primary" : "type-label rounded-full px-3.5 py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"}
              >{link.label}</Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-2 md:gap-3">
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
              <Link
                href={ROUTES.masuk}
                className="hidden type-label text-on-surface-variant hover:text-on-surface sm:inline"
              >
                Masuk
              </Link>
              <Link
                href={ROUTES.daftar}
                className="btn-primary !hidden !min-h-10 !px-5 !py-2 !text-[0.875rem] sm:!inline-flex"
              >
                <Icon name="rocket_launch" className="text-[18px]" />
                Daftar
              </Link>
            </>
          )}
          {session ? (
            <Link
              href={ROUTES.buatTrip}
              className="btn-primary !hidden !min-h-10 !px-5 !py-2 !text-[0.875rem] md:!inline-flex"
            >
              Buat Trip
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

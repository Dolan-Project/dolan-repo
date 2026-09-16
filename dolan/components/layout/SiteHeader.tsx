"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthSession } from "@/lib/contracts";
import { ROUTES, type NavKey } from "@/lib/routes";
import { Icon } from "@/components/ui/Icon";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UserAvatar } from "@/components/ui/UserAvatar";
import logoDolan from "@/app/logo_dolan.png";

const desktopLinks: { key: NavKey; href: string; label: string }[] = [
  { key: "beranda", href: ROUTES.beranda, label: "Beranda" },
  { key: "jelajah", href: ROUTES.jelajah, label: "Jelajah" },
  { key: "trip-saya", href: ROUTES.tripSaya, label: "Trip Saya" },
];

export function hideMobileHeader(pathname: string) {
  return (
    pathname.startsWith("/jelajah") ||
    pathname.startsWith("/wisata/") ||
    pathname.startsWith("/trip-saya") ||
    /^\/trip\/[^/]+(?:\/edit)?$/.test(pathname)
  );
}

export function HeaderSpacer({ flush = false }: { flush?: boolean }) {
  const pathname = usePathname();
  if (flush) return null;
  return (
    <div
      aria-hidden
      className={hideMobileHeader(pathname) ? "hidden md:block md:h-16" : "h-14 md:h-16"}
    />
  );
}

function isActive(pathname: string, key: NavKey) {
  if (key === "beranda") return pathname === "/";
  if (key === "jelajah")
    return (
      pathname.startsWith("/jelajah") ||
      pathname.startsWith("/wisata") ||
      pathname.startsWith("/itinerary") ||
      pathname === "/trip" ||
      pathname.startsWith("/trip/")
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
  const [scrolled, setScrolled] = useState(false);
  const compactMobile = hideMobileHeader(pathname);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`${compactMobile ? "hidden md:block" : ""} fixed top-0 z-50 w-full border-b border-[#e8edf3] bg-white/94 backdrop-blur-xl ${
        scrolled ? "shadow-[0_8px_30px_rgba(15,59,94,.06)]" : ""
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 md:h-16 md:px-6">
        <Link href={ROUTES.beranda} className="flex shrink-0 items-center" aria-label="DOLAN beranda">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo_dolan.png"
            alt="DOLAN"
            className="h-8 w-auto object-contain object-left mix-blend-multiply md:h-9"
          />
        </Link>

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
            href={ROUTES.rekomendasi}
            aria-current={pathname.startsWith("/rekomendasi") ? "page" : undefined}
            className={
              pathname.startsWith("/rekomendasi")
                ? "type-label hidden shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-3 py-2 text-primary lg:inline"
                : "type-label hidden shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface lg:inline"
            }
          >
            Rekomendasi
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0 md:gap-3">
          {session ? (
            <Link
              href={ROUTES.buatTrip}
              className="btn-primary !hidden !min-h-10 !gap-1 !px-4 !py-2 !text-[0.8125rem] md:!inline-flex"
            >
              <Icon name="add" className="text-[18px]" />
              Buat Trip
            </Link>
          ) : null}
          <Link
            href={ROUTES.rekomendasi}
            aria-label="Rekomendasi"
            aria-current={pathname.startsWith("/rekomendasi") ? "page" : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors md:hidden ${
              pathname.startsWith("/rekomendasi")
                ? "bg-primary/10 text-primary"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <Icon name="public" className="text-[22px]" />
          </Link>
          <NotificationBell session={session} unreadCount={unreadCount} />
          {session ? (
            <Link href={ROUTES.profil} aria-label="Profil" className="hidden md:inline-flex">
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

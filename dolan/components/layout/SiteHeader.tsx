"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ASSETS } from "@/lib/assets";
import { ROUTES, type NavKey } from "@/lib/routes";
import { Icon } from "@/components/ui/Icon";

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
      pathname.startsWith("/itinerary")
    );
  if (key === "trip-saya") return pathname.startsWith("/trip-saya");
  if (key === "buat-trip") return pathname.startsWith("/buat-trip");
  if (key === "profil") return pathname.startsWith("/profil");
  return false;
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/30 bg-surface-container-lowest/85 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-margin md:h-16 md:px-margin-desktop">
        <Link href={ROUTES.beranda} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Dolan Logo"
            className="h-7 w-auto object-contain"
            src={ASSETS.logo}
          />
          <span className="type-subtitle tracking-tight text-on-surface">
            Dolan
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {desktopLinks.map((link) => {
            const active = isActive(pathname, link.key);
            return (
              <Link
                key={link.key}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "type-label rounded-full bg-surface-container-high px-3.5 py-1.5 text-on-surface"
                    : "type-label rounded-full px-3.5 py-1.5 text-on-surface-variant transition-colors hover:text-on-surface"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            aria-label="Notifikasi"
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="notifications" className="text-[20px]" />
          </button>
          <Link href={ROUTES.profil} aria-label="Profil">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Profile"
              className="h-8 w-8 rounded-full object-cover"
              src={ASSETS.profile}
            />
          </Link>
          <Link
            href={ROUTES.buatTrip}
            className="btn-primary !hidden !min-h-9 !px-4 !py-1.5 !text-[0.8125rem] md:!inline-flex"
          >
            Buat Trip
          </Link>
        </div>
      </div>
    </header>
  );
}

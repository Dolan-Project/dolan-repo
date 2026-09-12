"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ASSETS } from "@/lib/assets";
import { ROUTES, type NavKey } from "@/lib/routes";

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
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 20);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const transparent = pathname === "/" && !scrolled;

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-500 ${transparent ? "border-transparent bg-transparent shadow-none" : "border-b border-white/60 bg-white/82 shadow-[0_8px_30px_rgba(15,59,94,.08)] backdrop-blur-xl"}`}>
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
          <Link href="/masuk" className="type-label rounded-full px-3 py-2 text-on-surface transition-colors hover:bg-surface-container">Masuk</Link>
          <Link href="/daftar" className="inline-flex min-h-9 items-center rounded-full bg-primary-container px-4 text-[0.8125rem] font-bold text-on-primary shadow-[0_8px_22px_rgba(255,90,61,.22)] transition-transform hover:-translate-y-0.5">Daftar</Link>
        </div>
      </div>
    </header>
  );
}

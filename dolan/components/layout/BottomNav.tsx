"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES, type NavKey } from "@/lib/routes";
import { Icon } from "@/components/ui/Icon";

const tabs: {
  key: NavKey;
  href: string;
  label: string;
  icon: string;
  fab?: boolean;
}[] = [
  { key: "beranda", href: ROUTES.beranda, label: "Beranda", icon: "home" },
  { key: "jelajah", href: ROUTES.jelajah, label: "Jelajah", icon: "explore" },
  {
    key: "buat-trip",
    href: ROUTES.buatTrip,
    label: "Buat",
    icon: "add",
    fab: true,
  },
  {
    key: "trip-saya",
    href: ROUTES.tripSaya,
    label: "Trip Saya",
    icon: "luggage",
  },
  { key: "profil", href: ROUTES.profil, label: "Profil", icon: "person" },
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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/30 bg-surface-container-lowest/95 pb-safe shadow-[0_-8px_24px_rgba(17,24,39,0.06)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-14 max-w-lg items-end justify-around px-1">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.key);
          if (tab.fab) {
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className="-mt-5 flex flex-col items-center gap-0.5"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-[0_10px_24px_rgba(255,90,61,0.32)]">
                  <Icon name={tab.icon} className="text-[24px]" />
                </span>
                <span className="type-micro text-on-surface-variant">
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-[52px] flex-col items-center gap-0.5 py-1.5 ${
                active ? "text-primary-container" : "text-on-surface-variant"
              }`}
            >
              <Icon name={tab.icon} filled={active} className="text-[22px]" />
              <span className="type-micro">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

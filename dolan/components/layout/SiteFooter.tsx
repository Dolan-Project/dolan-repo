"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/chat" || /\/trip\/[^/]+\/chat$/.test(pathname)) return null;

  return (
    <footer className="border-t border-sky-100 bg-gradient-to-br from-[#eaf7ff] via-white to-[#fff2e8] text-slate-900">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-12 md:grid-cols-[1.35fr_.7fr_.8fr_1fr] md:px-8">
        <div>
          <Link href={ROUTES.beranda} className="inline-flex" aria-label="DOLAN beranda">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo_dolan.png"
              alt="DOLAN"
              className="h-9 w-auto object-contain object-left mix-blend-multiply"
            />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">
            Temukan tujuan, susun itinerary, dan kenalan dengan traveler yang
            punya rencana perjalanan serupa.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-extrabold">Jelajahi</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <Link href={ROUTES.provinsi}>38 provinsi</Link>
            <Link href={ROUTES.jelajah}>Destinasi</Link>
            <Link href={`${ROUTES.jelajah}?tab=trip`}>Trip publik</Link>
            <Link href={ROUTES.tripSaya}>Trip Saya</Link>
            <Link href={ROUTES.buatTrip}>Buat itinerary</Link>
            <Link href={ROUTES.profil}>Komunitas</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-extrabold">Dukungan</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-600">
            <Link href="/#faq">FAQ</Link>
            <Link href={ROUTES.notifikasi}>Notifikasi</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-extrabold">Temui kami</h3>
          <p className="mt-4 flex gap-2 text-sm leading-6 text-slate-600">
            <Icon name="location_on" className="mt-0.5 text-sky-300" />
            Kebayoran Baru,
            <br />
            Jakarta Selatan
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <Icon name="mail" className="text-sky-300" />
            halo@dolan.id
          </p>
        </div>
      </div>
      <div className="border-t border-sky-100 px-6 py-5 text-center text-xs text-slate-500">
        © 2026 Dolan Indonesia · Dibuat untuk perjalanan yang lebih bermakna.
      </div>
    </footer>
  );
}

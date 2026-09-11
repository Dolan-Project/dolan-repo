import Link from "next/link";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

export function SiteFooter() {
  return (
    <footer className="hidden border-t border-outline-variant/40 bg-surface-container-low md:block">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-margin-desktop py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Dolan Logo"
            className="h-6 w-auto object-contain"
            src={ASSETS.logo}
          />
          <div>
            <p className="type-label text-on-surface">Dolan</p>
            <p className="type-caption text-on-surface-variant">
              Join gratis — biaya perjalanan ditanggung masing-masing.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 type-label text-on-surface-variant">
          <Link href={ROUTES.jelajah} className="hover:text-on-surface">
            Jelajah
          </Link>
          <Link href={ROUTES.buatTrip} className="hover:text-on-surface">
            Buat Trip
          </Link>
          <span className="cursor-default">Tentang</span>
          <span className="cursor-default">Bantuan</span>
          <span className="cursor-default">Privasi</span>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { Icon } from "@/components/ui/Icon";

export function SiteFooter() {
  return (
    <footer className="hidden border-t border-outline-variant/40 bg-surface-container-lowest pt-10 pb-8 md:block">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-margin-desktop md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary">
              <Icon name="explore" className="text-[20px]" />
            </span>
            <p className="type-subtitle text-on-surface">DOLAN</p>
          </div>
          <p className="type-body mt-3 max-w-sm text-on-surface-variant">
            Platform open-trip dan social travel. Temukan teman seperjalanan,
            rencanakan ekspedisi bersama, tanpa calo.
          </p>
          <p className="chip mt-3 bg-surface-container-low text-primary">
            Join gratis — biaya perjalanan mandiri
          </p>
        </div>
        <div className="flex flex-col gap-2 type-label text-on-surface-variant">
          <Link href={ROUTES.jelajah} className="hover:text-primary">
            Jelajah
          </Link>
          <Link href={ROUTES.buatTrip} className="hover:text-primary">
            Buat Trip
          </Link>
          <Link href={ROUTES.tripSaya} className="hover:text-primary">
            Trip Saya
          </Link>
        </div>
        <div className="flex flex-col gap-2 type-label text-on-surface-variant">
          <span>Bantuan</span>
          <span>Privasi</span>
          <span>Tentang</span>
        </div>
      </div>
    </footer>
  );
}

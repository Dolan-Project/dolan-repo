import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

export default function BuatTripPage() {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[55vh] max-w-[560px] flex-col items-center justify-center px-margin py-12 text-center md:px-margin-desktop">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed text-primary">
          <Icon name="add_circle" className="text-[24px]" />
        </div>
        <h1 className="type-title text-on-surface">Buat Trip</h1>
        <p className="type-body mt-2 text-on-surface-variant">
          Form buat trip belum diimplementasi (UI-only stage). Mulai dari
          itinerary komunitas Bali sebagai referensi.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={ROUTES.itineraryBali} className="btn-primary !min-h-10">
            Lihat itinerary Bali
          </Link>
          <Link href={ROUTES.wisataBali} className="btn-secondary !min-h-10">
            Detail wisata Bali
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

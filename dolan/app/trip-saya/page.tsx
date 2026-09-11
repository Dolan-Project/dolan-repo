import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

export default function TripSayaPage() {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[55vh] max-w-[560px] flex-col items-center justify-center px-margin py-12 text-center md:px-margin-desktop">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-fixed text-secondary">
          <Icon name="luggage" className="text-[24px]" />
        </div>
        <h1 className="type-title text-on-surface">Trip Saya</h1>
        <p className="type-body mt-2 text-on-surface-variant">
          Halaman ini belum punya desain Stitch. Untuk sekarang kamu bisa
          menjelajah trip publik atau buat rencana baru.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={ROUTES.jelajah} className="btn-primary !min-h-10">
            Jelajah trip
          </Link>
          <Link href={ROUTES.buatTrip} className="btn-secondary !min-h-10">
            Buat Trip
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

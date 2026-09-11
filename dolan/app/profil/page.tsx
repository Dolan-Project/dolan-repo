import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

export default function ProfilPage() {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[55vh] max-w-[560px] flex-col items-center justify-center px-margin py-12 text-center md:px-margin-desktop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Profil"
          className="mb-3 h-16 w-16 rounded-full object-cover ring-4 ring-secondary-fixed"
          src={ASSETS.profile}
        />
        <h1 className="type-title text-on-surface">Profil</h1>
        <p className="type-body mt-2 text-on-surface-variant">
          Halaman profil belum punya desain Stitch. Navigasi lain tetap bisa
          dipakai.
        </p>
        <Link href={ROUTES.beranda} className="btn-primary mt-5 !min-h-10">
          <Icon name="home" className="text-[16px]" />
          Kembali ke Beranda
        </Link>
      </div>
    </AppShell>
  );
}

import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { Icon } from "@/components/ui/Icon";

type ReturnToActionBannerProps = {
  nextPath: string;
  actionLabel: string;
};

export function ReturnToActionBanner({
  nextPath,
  actionLabel,
}: ReturnToActionBannerProps) {
  const masuk = `${ROUTES.masuk}?next=${encodeURIComponent(nextPath)}`;
  const daftar = `${ROUTES.daftar}?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl bg-surface-container-lowest p-6 shadow-[0_20px_40px_-10px_rgba(16,36,58,0.14)] md:p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-fixed text-on-secondary-container">
        <Icon name="bookmark_added" className="text-[26px]" />
      </div>
      <div className="flex items-start gap-2.5 rounded-xl bg-surface-container-low p-3.5">
        <Icon name="lock" className="mt-0.5 text-[20px] text-primary" />
        <p className="type-body text-on-surface">
          <strong>Masuk untuk melanjutkan rencana kamu</strong> — Draf destinasi
          dan data input tersimpan aman dan tidak akan hilang.
        </p>
      </div>
      <h1 className="type-title mt-4 text-on-surface">Satu Langkah Lagi!</h1>
      <p className="type-body mt-1 text-on-surface-variant">{actionLabel}</p>
      <div className="mt-5 flex flex-col gap-2">
        <Link href={masuk} className="btn-primary w-full !min-h-12">
          Masuk Sekarang
        </Link>
        <Link href={daftar} className="btn-secondary w-full">
          Belum Punya Akun? Daftar Cepat
        </Link>
      </div>
    </div>
  );
}

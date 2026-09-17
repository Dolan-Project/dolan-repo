"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

type CekEmailActionsProps = {
  email?: string;
  next?: string;
  isReset: boolean;
  error?: string;
};

export function CekEmailActions({ email, next, isReset, error }: CekEmailActionsProps) {
  return (
    <div className="mt-4 flex w-full flex-col gap-2">
      {error ? (
        <p className="type-body text-error" role="alert">
          Tautan tidak valid atau kedaluwarsa.
        </p>
      ) : null}

      {isReset ? (
        <>
          <p className="type-caption text-on-surface-variant">
            Buka email{email ? ` di ${email}` : ""} dan klik tautan reset. Halaman ini tidak
            memverifikasi otomatis.
          </p>
          <Link href={ROUTES.lupaPassword} className="btn-primary w-full !min-h-12">
            Kirim ulang tautan reset
          </Link>
          <Link
            href={ROUTES.masuk}
            className="rounded-full py-2.5 type-label text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          >
            Kembali ke masuk
          </Link>
        </>
      ) : (
        <Link href={next || ROUTES.masuk} className="btn-primary w-full !min-h-12">
          Lanjut masuk
        </Link>
      )}

      {isReset ? (
        <div className="mt-2 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-left">
          <Icon name="info" className="mt-0.5 text-[20px] text-secondary" />
          <p className="type-caption text-on-surface-variant">
            Cek folder spam jika email belum muncul dalam beberapa menit.
          </p>
        </div>
      ) : null}
    </div>
  );
}

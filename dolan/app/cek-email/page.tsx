import { AUTH_PATHS } from "@/lib/contracts";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  searchParams: Promise<{
    email?: string;
    next?: string;
    type?: string;
    error?: string;
  }>;
};

export default async function CekEmailPage({ searchParams }: PageProps) {
  const { email, next, type, error } = await searchParams;
  const isReset = type === "reset";
  const callback = new URLSearchParams({ token: "valid" });
  if (next) callback.set("next", next);
  const resetLink = `${ROUTES.resetPassword}?token=valid`;

  return (
    <AuthShell>
      <div className="flex flex-col items-center py-2 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-primary">
          <Icon name="mail" className="text-[32px]" />
        </div>
        <h1 className="type-title text-on-surface">Cek Kotak Masuk Kamu</h1>
        {error ? (
          <p className="type-body mt-2 text-error" role="alert">
            Tautan tidak valid atau kedaluwarsa. Minta tautan baru.
          </p>
        ) : (
          <p className="type-body mt-2 max-w-md text-on-surface-variant">
            Kami telah mengirim tautan{" "}
            {isReset ? "reset kata sandi" : "verifikasi"}
            {email ? (
              <>
                {" "}
                ke <strong className="text-on-surface">{email}</strong>
              </>
            ) : null}
            . Bukan kode OTP — buka tautan di email, lalu lanjut di sini.
          </p>
        )}
        <div className="mt-6 flex w-full flex-col gap-2">
          <Link
            href={
              isReset
                ? resetLink
                : `${AUTH_PATHS.callback}?${callback.toString()}`
            }
            className="btn-primary w-full !min-h-12"
          >
            {isReset ? "Saya sudah buka tautan" : "Verifikasi & Lanjutkan"}
          </Link>
          <Link
            href={isReset ? ROUTES.lupaPassword : ROUTES.daftar}
            className="rounded-full py-2.5 type-label text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          >
            Kirim ulang tautan
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

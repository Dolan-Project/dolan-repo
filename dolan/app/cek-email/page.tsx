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
    <AuthShell
      mode="utility"
      sideHref={ROUTES.masuk}
      sideLabel="Masuk"
      title="Cek kotak masuk kamu"
      description={
        error
          ? "Tautan tidak valid atau kedaluwarsa. Minta tautan baru."
          : `Kami telah mengirim tautan ${isReset ? "reset kata sandi" : "verifikasi"}${email ? ` ke ${email}` : ""}. Buka tautan di email, lalu lanjut di sini.`
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Icon name="mail" className="text-[32px]" />
        </div>
        {error ? (
          <p className="type-body text-error" role="alert">
            Tautan tidak valid atau kedaluwarsa.
          </p>
        ) : null}
        <div className="mt-4 flex w-full flex-col gap-2">
          <Link
            href={isReset ? resetLink : `${AUTH_PATHS.callback}?${callback.toString()}`}
            className="btn-primary w-full !min-h-12"
          >
            {isReset ? "Saya sudah buka tautan" : "Verifikasi & lanjutkan"}
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

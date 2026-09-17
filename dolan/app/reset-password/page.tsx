import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { ROUTES } from "@/lib/routes";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <AuthShell
        mode="utility"
        sideHref={ROUTES.lupaPassword}
        sideLabel="Kirim ulang"
        title="Tautan tidak valid"
        description="Minta tautan reset yang baru dari halaman lupa password."
      >
        <Link href={ROUTES.lupaPassword} className="btn-primary w-full !min-h-12">
          Kirim tautan baru
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      mode="utility"
      sideHref={ROUTES.masuk}
      sideLabel="Masuk"
      eyebrow={
        <>
          <Icon name="lock" className="text-[15px]" /> Keamanan akun
        </>
      }
      title="Atur kata sandi baru"
      description="Masukkan kata sandi baru untuk akun Dolan kamu."
    >
      <Link
        href={ROUTES.lupaPassword}
        className="mb-1 inline-flex items-center gap-1 type-micro text-on-surface-variant hover:text-on-surface"
      >
        <Icon name="arrow_back" className="text-[16px]" /> Kembali
      </Link>
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}

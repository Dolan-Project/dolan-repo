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
      <AuthShell>
        <div>
          <h1 className="type-title text-on-surface">
            Tautan tidak valid atau kedaluwarsa
          </h1>
          <p className="type-body mt-2 text-on-surface-variant">
            Minta tautan reset yang baru.
          </p>
        </div>
        <Link href={ROUTES.lupaPassword} className="btn-brand">
          Kirim tautan baru
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div>
        <Link
          href={ROUTES.lupaPassword}
          className="mb-2 inline-flex items-center gap-1 type-micro text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-[16px]" /> Kembali
        </Link>
        <h1 className="type-title text-on-surface">Atur Kata Sandi Baru</h1>
        <p className="type-body mt-1 text-on-surface-variant">
          Masukkan kata sandi baru untuk akun Dolan kamu.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}

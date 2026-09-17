import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

export default function LupaPasswordPage() {
  return (
    <AuthShell
      mode="utility"
      sideHref={ROUTES.masuk}
      sideLabel="Masuk"
      eyebrow={
        <>
          <Icon name="lock" className="text-[15px]" /> Pulihkan akses
        </>
      }
      title="Lupa kata sandi?"
      description="Masukkan email terdaftar. Kami kirim tautan pembaruan kata sandi yang aman."
    >
      <Link
        href={ROUTES.masuk}
        className="mb-1 inline-flex items-center gap-1 type-micro text-on-surface-variant hover:text-on-surface"
      >
        <Icon name="arrow_back" className="text-[16px]" /> Kembali ke masuk
      </Link>
      <ForgotPasswordForm />
    </AuthShell>
  );
}

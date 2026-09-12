import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

export default function LupaPasswordPage() {
  return (
    <AuthShell>
      <div>
        <Link
          href={ROUTES.masuk}
          className="mb-2 inline-flex items-center gap-1 type-micro text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="arrow_back" className="text-[16px]" /> Kembali ke Masuk
        </Link>
        <h1 className="type-title text-on-surface">Pulihkan Akses Akun</h1>
        <p className="type-body mt-1 text-on-surface-variant">
          Masukkan email terdaftar untuk menerima tautan pembaruan kata sandi
          aman.
        </p>
      </div>
      <ForgotPasswordForm />
    </AuthShell>
  );
}

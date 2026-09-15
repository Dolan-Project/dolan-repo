import { AuthShell } from "@/components/auth/AuthShell";
import { CekEmailActions } from "@/components/auth/CekEmailActions";
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

  return (
    <AuthShell
      mode="utility"
      sideHref={ROUTES.masuk}
      sideLabel="Masuk"
      title="Cek kotak masuk kamu"
      description={
        error
          ? "Tautan tidak valid atau kedaluwarsa. Minta tautan baru."
          : isReset
            ? `Kami telah mengirim tautan reset kata sandi${email ? ` ke ${email}` : ""}. Buka tautan di email, lalu lanjut di sini.`
            : "Kamu sudah bisa masuk tanpa verifikasi email."
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Icon name="mail" className="text-[32px]" />
        </div>
        <CekEmailActions email={email} next={next} isReset={isReset} error={error} />
      </div>
    </AuthShell>
  );
}

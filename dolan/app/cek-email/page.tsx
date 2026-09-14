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
    debugToken?: string;
  }>;
};

export default async function CekEmailPage({ searchParams }: PageProps) {
  const { email, next, type, error, debugToken } = await searchParams;
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
          : `Kami telah mengirim tautan ${isReset ? "reset kata sandi" : "verifikasi"}${email ? ` ke ${email}` : ""}. Buka tautan di email, lalu lanjut di sini.`
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Icon name="mail" className="text-[32px]" />
        </div>
        <CekEmailActions
          email={email}
          next={next}
          isReset={isReset}
          error={error}
          debugToken={debugToken}
        />
      </div>
    </AuthShell>
  );
}

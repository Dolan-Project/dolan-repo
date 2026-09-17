import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Icon } from "@/components/ui/Icon";
import { getSession } from "@/lib/auth/get-session";
import { resolveAfterAuth } from "@/lib/auth/post-auth-path";

type PageProps = {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
};

export default async function MasukPage({ searchParams }: PageProps) {
  const { next, error, message } = await searchParams;
  const session = await getSession();
  if (session) {
    redirect(resolveAfterAuth(session, next));
  }

  return (
    <AuthShell
      mode="login"
      eyebrow={
        <>
          <Icon name="login" className="text-[15px]" /> Selamat datang kembali
        </>
      }
      title="Masuk ke komunitas Dolan"
      description="Lanjutkan rencana penjelajahan dan diskusi trip bareng teman seperjalanan."
    >
      <LoginForm
        next={next}
        initialError={
          error === "google"
            ? message || "Login Google gagal. Coba lagi atau masuk dengan email."
            : undefined
        }
      />
    </AuthShell>
  );
}

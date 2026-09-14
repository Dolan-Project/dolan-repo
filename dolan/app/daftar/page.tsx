import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Icon } from "@/components/ui/Icon";
import { getSession } from "@/lib/auth/get-session";
import { resolveAfterAuth } from "@/lib/auth/post-auth-path";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function DaftarPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const session = await getSession();
  if (session) {
    redirect(resolveAfterAuth(session, next));
  }

  return (
    <AuthShell
      mode="register"
      eyebrow={
        <>
          <Icon name="group_add" className="text-[15px]" /> Gabung komunitas terbuka
        </>
      }
      title="Buat akun traveler-mu"
      description="Daftar dalam hitungan menit. Siap explore Labuan Bajo sampai Rinjani bareng komunitas."
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Icon } from "@/components/ui/Icon";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function MasukPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return (
    <AuthShell>
      <div>
        <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 type-micro text-on-primary-fixed">
          <Icon name="login" className="text-[16px]" /> Selamat Datang Kembali
        </span>
        <h1 className="type-title text-on-surface">Masuk ke Komunitas DOLAN</h1>
        <p className="type-body mt-1 text-on-surface-variant">
          Lanjutkan rencana penjelajahan dan diskusi trip bareng teman
          seperjalanan.
        </p>
      </div>
      <LoginForm next={next} />
    </AuthShell>
  );
}

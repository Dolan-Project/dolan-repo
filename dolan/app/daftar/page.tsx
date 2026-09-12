import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Icon } from "@/components/ui/Icon";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function DaftarPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return (
    <AuthShell>
      <div>
        <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary-fixed px-3 py-1 type-micro text-on-secondary-container">
          <Icon name="group_add" className="text-[16px]" /> Gabung Komunitas Terbuka
        </span>
        <h1 className="type-title text-on-surface">Mulai Petualanganmu</h1>
        <p className="type-body mt-1 text-on-surface-variant">
          Daftar dalam 1 menit tanpa berkas rumit. Siap explore Labuan Bajo
          sampai Rinjani.
        </p>
      </div>
      <RegisterForm next={next} />
    </AuthShell>
  );
}

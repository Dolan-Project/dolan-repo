import { LOGIN_PAGE_PATH, resolvePostAuthPath } from "@/lib/contracts";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getSession } from "@/lib/auth/get-session";
import { Icon } from "@/components/ui/Icon";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function ProfilEditPage({ searchParams }: PageProps) {
  const session = await getSession();
  const { next } = await searchParams;
  if (!session) {
    redirect(`${LOGIN_PAGE_PATH}?next=/profil/edit`);
  }

  const skipHref = resolvePostAuthPath(next);

  return (
    <AppShell>
      <div className="mx-auto max-w-[560px] px-margin py-8 md:px-margin-desktop">
        <div className="card-surface p-6 md:p-10">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-tertiary-fixed px-3 py-1 type-micro text-on-tertiary-fixed">
                <Icon name="person" className="text-[16px]" /> Langkah 2 dari 2
              </span>
              <h1 className="type-title text-on-surface">Lengkapi Profil Traveler</h1>
              <p className="type-body mt-1 text-on-surface-variant">
                Bantu rekan rombongan mengenalmu sebelum berangkat bersama.
              </p>
            </div>
            <Link
              href={skipHref}
              className="shrink-0 type-micro text-on-surface-variant hover:text-primary"
            >
              Lewati Nanti
            </Link>
          </div>
          <ProfileForm user={session.user} next={next} />
        </div>
      </div>
    </AppShell>
  );
}

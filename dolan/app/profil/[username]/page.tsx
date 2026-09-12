import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileView } from "@/components/profile/ProfileView";
import { getSession } from "@/lib/auth/get-session";
import { handleGetPublicProfileRequest } from "@/lib/auth/handle-profile";
import { profilePrimaryAction } from "@/lib/profile/owner";
import { ROUTES } from "@/lib/routes";
import type { PublicUser } from "@/lib/contracts";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilPage({ params }: PageProps) {
  const { username } = await params;
  const session = await getSession();
  const response = await handleGetPublicProfileRequest(username);
  const json = (await response.json()) as
    | { success: true; data: PublicUser }
    | { success: false };

  if (!json.success) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[560px] px-margin py-16 text-center">
          <h1 className="type-title text-on-surface">Pengguna tidak ditemukan</h1>
          <p className="type-body mt-2 text-on-surface-variant">
            Username ini tidak ada di Dolan.
          </p>
          <Link href={ROUTES.beranda} className="btn-primary mt-5">
            Kembali ke Beranda
          </Link>
        </div>
      </AppShell>
    );
  }

  const action = profilePrimaryAction(session?.user.username, json.data.username);

  return (
    <AppShell>
      <ProfileView user={json.data} action={action} />
    </AppShell>
  );
}

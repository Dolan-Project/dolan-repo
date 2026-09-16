import { LOGIN_PAGE_PATH } from "@/lib/contracts";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileView } from "@/components/profile/ProfileView";
import { getSession } from "@/lib/auth/get-session";

export default async function ProfilPage() {
  const session = await getSession();
  if (!session) {
    redirect(`${LOGIN_PAGE_PATH}?next=/profil`);
  }

  return (
    <AppShell>
      <ProfileView user={session.user} action="edit" />
    </AppShell>
  );
}

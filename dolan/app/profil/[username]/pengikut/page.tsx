import { AppShell } from "@/components/layout/AppShell";
import { CommunityUserList } from "@/components/profile/CommunityUserList";

type PageProps = { params: Promise<{ username: string }> };

export default async function PengikutPage({ params }: PageProps) {
  const { username } = await params;
  return (
    <AppShell>
      <CommunityUserList
        username={username}
        kind="followers"
        title={`Pengikut @${username}`}
      />
    </AppShell>
  );
}

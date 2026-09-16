import { AppShell } from "@/components/layout/AppShell";
import { CommunityUserList } from "@/components/profile/CommunityUserList";

type PageProps = { params: Promise<{ username: string }> };

export default async function MengikutiPage({ params }: PageProps) {
  const { username } = await params;
  return (
    <AppShell>
      <CommunityUserList
        username={username}
        kind="following"
        title={`Mengikuti @${username}`}
      />
    </AppShell>
  );
}

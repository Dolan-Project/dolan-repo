import { AppShell } from "@/components/layout/AppShell";
import { HomeExperience } from "@/features/home/components/HomeExperience";
import { HomeFeed } from "@/features/home/components/HomeFeed";
import { loadHomeFeed } from "@/features/home/load-home-feed";
import { getSession } from "@/lib/auth/get-session";

export default async function BerandaPage() {
  const session = await getSession();

  if (!session) {
    return (
      <AppShell flushHeader>
        <HomeExperience />
      </AppShell>
    );
  }

  const feed = await loadHomeFeed();
  return (
    <AppShell>
      <HomeFeed session={session} feed={feed} />
    </AppShell>
  );
}

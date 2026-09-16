import { AppShell } from "@/components/layout/AppShell";
import { HomeExperience } from "@/features/home/components/HomeExperience";
import { HomeFeed } from "@/features/home/components/HomeFeed";
import { isLiveGuestHome, loadGuestHome } from "@/features/home/load-guest-home";
import { loadHomeFeed } from "@/features/home/load-home-feed";
import { getSession } from "@/lib/auth/get-session";

export default async function BerandaPage() {
  const session = await getSession();

  if (!session) {
    const live = isLiveGuestHome() ? await loadGuestHome() : null;
    return (
      <AppShell showFooter flushHeader>
        <HomeExperience live={live} />
      </AppShell>
    );
  }

  const feed = await loadHomeFeed();
  return (
    <AppShell showFooter={false}>
      <HomeFeed session={session} feed={feed} />
    </AppShell>
  );
}

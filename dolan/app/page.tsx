import { AppShell } from "@/components/layout/AppShell";
import { HomeFeed } from "@/features/home/components/HomeFeed";
import { emptyHomeFeed, loadHomeFeed } from "@/features/home/load-home-feed";
import { getSession } from "@/lib/auth/get-session";

export default async function BerandaPage() {
  const session = await getSession();
  const feed = session ? await loadHomeFeed() : { ok: true as const, data: emptyHomeFeed() };

  return (
    <AppShell>
      <HomeFeed session={session} feed={feed} />
    </AppShell>
  );
}

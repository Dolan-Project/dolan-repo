import { AppShell } from "@/components/layout/AppShell";
import { HistoryPanel } from "@/components/profile/HistoryPanel";

type PageProps = { params: Promise<{ username: string }> };

export default async function RiwayatPage({ params }: PageProps) {
  const { username } = await params;
  return (
    <AppShell>
      <HistoryPanel username={username} />
    </AppShell>
  );
}

import { AppShell } from "@/components/layout/AppShell";
import { ReviewForm } from "@/components/profile/ReviewForm";

type PageProps = { params: Promise<{ username: string }> };

export default async function UlasanPage({ params }: PageProps) {
  const { username } = await params;
  return (
    <AppShell>
      <ReviewForm username={username} />
    </AppShell>
  );
}

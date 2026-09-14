import { AppShell } from "@/components/layout/AppShell";
import { ReviewForm } from "@/components/profile/ReviewForm";

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tripId?: string }>;
};

export default async function UlasanPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const { tripId } = await searchParams;
  return (
    <AppShell>
      <ReviewForm username={username} tripId={tripId ?? null} />
    </AppShell>
  );
}

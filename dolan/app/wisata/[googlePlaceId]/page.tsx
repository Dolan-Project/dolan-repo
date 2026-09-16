import { AppShell } from "@/components/layout/AppShell";
import { PlaceDetailExperience } from "@/features/explore/PlaceDetailExperience";

export default async function DetailWisataPage({
  params,
}: {
  params: Promise<{ googlePlaceId: string }>;
}) {
  const { googlePlaceId } = await params;
  return (
    <AppShell>
      <PlaceDetailExperience googlePlaceId={googlePlaceId} />
    </AppShell>
  );
}

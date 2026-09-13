import { TripDetailView } from "@/components/trip/TripDetailView";
import { TripExperience } from "@/components/trip/TripExperience";
import { getSession } from "@/lib/auth/get-session";

type PageProps = { params: Promise<{ tripId: string }> };

export default async function TripDetailPage({ params }: PageProps) {
  const { tripId } = await params;
  const session = await getSession();
  return (
    <>
      <TripDetailView tripId={tripId} />
      <TripExperience
        tripId={tripId}
        isLoggedIn={Boolean(session)}
        emailVerified={Boolean(session?.emailVerified)}
      />
    </>
  );
}

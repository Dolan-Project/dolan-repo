import { TripDetailView } from "@/components/trip/TripDetailView";
import { getSession } from "@/lib/auth/get-session";

type PageProps = { params: Promise<{ tripId: string }> };

export default async function TripDetailPage({ params }: PageProps) {
  const { tripId } = await params;
  const session = await getSession();
  return (
    <TripDetailView
      tripId={tripId}
      isLoggedIn={Boolean(session)}
    />
  );
}

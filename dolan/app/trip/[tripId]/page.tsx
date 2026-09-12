import { TripDetailView } from "@/components/trip/TripDetailView";

type PageProps = { params: Promise<{ tripId: string }> };

export default async function TripDetailPage({ params }: PageProps) {
  const { tripId } = await params;
  return <TripDetailView tripId={tripId} />;
}

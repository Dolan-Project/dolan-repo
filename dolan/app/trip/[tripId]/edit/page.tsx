import { TripEditForm } from "@/components/trip/TripEditForm";

type PageProps = { params: Promise<{ tripId: string }> };

export default async function TripEditPage({ params }: PageProps) {
  const { tripId } = await params;
  return <TripEditForm tripId={tripId} />;
}

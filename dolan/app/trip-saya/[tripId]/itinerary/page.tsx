import { ItineraryEditorExperience } from "@/features/itinerary/ItineraryEditorExperience";

export default async function TripItineraryEditorPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <ItineraryEditorExperience tripId={tripId} />;
}

import { TripChatRoom } from "@/components/chat/TripChatRoom";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";

export default async function TripChatPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const session = await getSession();
  if (!session) redirect(`/masuk?next=${encodeURIComponent(`/trip/${tripId}/chat`)}`);
  return <TripChatRoom tripId={tripId} />;
}

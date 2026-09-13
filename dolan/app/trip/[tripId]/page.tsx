import { AppShell } from "@/components/layout/AppShell";
import { TripExperience } from "@/components/trip/TripExperience";
import { getSession } from "@/lib/auth/get-session";

type PageProps = {
  params: Promise<{ tripId: string }>;
};

export default async function TripPage({ params }: PageProps) {
  const { tripId } = await params;
  const session = await getSession();
  return (
    <AppShell>
      <TripExperience
        tripId={tripId}
        isLoggedIn={Boolean(session)}
        emailVerified={Boolean(session?.emailVerified)}
      />
    </AppShell>
  );
}

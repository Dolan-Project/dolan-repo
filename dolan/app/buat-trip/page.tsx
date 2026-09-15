import { ReturnToActionBanner } from "@/components/auth/ReturnToActionBanner";
import { SaveReturnDraft } from "@/components/auth/SaveReturnDraft";
import { AppShell } from "@/components/layout/AppShell";
import { CreateTripWizard } from "@/components/trip/CreateTripWizard";
import { getSession } from "@/lib/auth/get-session";
import { ROUTES } from "@/lib/routes";

export default async function BuatTripPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string; placeId?: string; destination?: string }>;
}) {
  const session = await getSession();
  const query = await searchParams;
  const returnQuery = new URLSearchParams();
  if (query.templateId) returnQuery.set("templateId", query.templateId);
  if (query.placeId) returnQuery.set("placeId", query.placeId);
  if (query.destination) returnQuery.set("destination", query.destination);
  const returnPath = `${ROUTES.buatTrip}${returnQuery.size ? `?${returnQuery}` : ""}`;

  if (!session) {
    return (
      <AppShell>
        <div className="min-h-[70dvh] bg-[radial-gradient(circle_at_top_right,rgba(254,137,60,.16),transparent_28%),linear-gradient(180deg,#f4f8ff,white)]">
          <div className="mx-auto max-w-[560px] px-margin py-12 md:px-margin-desktop">
            <SaveReturnDraft path={returnPath} />
            <ReturnToActionBanner
              nextPath={returnPath}
              actionLabel="Aksi kamu untuk membuat trip telah diamankan. Masuk dulu, lalu kembali ke form ini."
            />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-[70dvh] bg-[radial-gradient(circle_at_top_right,rgba(254,137,60,.16),transparent_28%),linear-gradient(180deg,#f4f8ff,white)]">
        <CreateTripWizard
          templateId={query.templateId}
          initialPlaceId={query.placeId}
          initialDestination={query.destination}
        />
      </div>
    </AppShell>
  );
}

import { ReturnToActionBanner } from "@/components/auth/ReturnToActionBanner";
import { SaveReturnDraft } from "@/components/auth/SaveReturnDraft";
import { AppShell } from "@/components/layout/AppShell";
import { CreateTripWizard } from "@/components/trip/CreateTripWizard";
import { getSession } from "@/lib/auth/get-session";
import { ROUTES } from "@/lib/routes";

export default async function BuatTripPage() {
  const session = await getSession();

  if (!session) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[560px] px-margin py-12 md:px-margin-desktop">
          <SaveReturnDraft path={ROUTES.buatTrip} />
          <ReturnToActionBanner
            nextPath={ROUTES.buatTrip}
            actionLabel="Aksi kamu untuk membuat trip telah diamankan. Masuk dulu, lalu kembali ke form ini."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <CreateTripWizard />
    </AppShell>
  );
}

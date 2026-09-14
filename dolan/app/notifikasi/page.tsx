import { AppShell } from "@/components/layout/AppShell";
import { NotificationList } from "@/components/notifications/NotificationList";
import { PushOptIn } from "@/components/pwa/PushOptIn";

export default function NotifikasiPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <PushOptIn />
        <NotificationList />
      </div>
    </AppShell>
  );
}

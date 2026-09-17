import { AppShell } from "@/components/layout/AppShell";
import { NotificationList } from "@/components/notifications/NotificationList";
import { PushOptIn } from "@/components/pwa/PushOptIn";

export default function NotifikasiPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-4 px-margin py-8 md:px-margin-desktop">
        <p className="type-caption text-on-surface-variant">
          Inbox juga bisa dibuka dari ikon lonceng di pojok kanan atas.
        </p>
        <PushOptIn />
        <NotificationList />
      </div>
    </AppShell>
  );
}

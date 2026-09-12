import { AppShell } from "@/components/layout/AppShell";

export default function JelajahLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell withBottomNavPad={false} showFooter={false}>
      {children}
    </AppShell>
  );
}

import { AppShell } from "@/components/layout/AppShell";

export default function TripDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

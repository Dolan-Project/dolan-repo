import { AppShell } from "@/components/layout/AppShell";

export default function TripSayaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell showFooter={false}>{children}</AppShell>;
}

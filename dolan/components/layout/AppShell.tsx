import { BottomNav } from "@/components/layout/BottomNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

type AppShellProps = {
  children: React.ReactNode;
  withBottomNavPad?: boolean;
  showFooter?: boolean;
  flushHeader?: boolean;
};

export function AppShell({
  children,
  withBottomNavPad = true,
  showFooter = true,
  flushHeader = false,
}: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-surface text-on-surface">
      <SiteHeader />
      <main
        className={`flex-1 ${flushHeader ? "pt-0" : "pt-14 md:pt-16"} ${withBottomNavPad ? "pb-20 md:pb-0" : ""}`}
      >
        {children}
      </main>
      {showFooter ? <SiteFooter /> : null}
      <BottomNav />
    </div>
  );
}

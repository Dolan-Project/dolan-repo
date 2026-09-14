import { BottomNav } from "@/components/layout/BottomNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSession } from "@/lib/auth/get-session";
import { socialRouteHandlers } from "@/lib/social/adapter";
import { cookies } from "next/headers";

type AppShellProps = {
  children: React.ReactNode;
  withBottomNavPad?: boolean;
  showFooter?: boolean;
  flushHeader?: boolean;
};

export async function AppShell({
  children,
  withBottomNavPad = true,
  showFooter = true,
  flushHeader = false,
}: AppShellProps) {
  const session = await getSession();
  let unreadCount = 0;
  if (session) {
    const cookie = (await cookies())
      .getAll()
      .map((item) => `${item.name}=${item.value}`)
      .join("; ");
    const response = await socialRouteHandlers.notifications.GET(
      new Request("http://localhost/api/v1/notifications", {
        headers: cookie ? { cookie } : {},
      }),
    );
    const json = (await response.json()) as
      | { success: true; data: Array<{ readAt?: string | null }>; pagination?: { totalItems: number } }
      | { success: true; data: { unreadCount: number } }
      | { success: false };
    if (json.success) {
      if (Array.isArray(json.data)) {
        unreadCount = json.data.filter((item) => !item.readAt).length;
      } else if ("unreadCount" in json.data) {
        unreadCount = json.data.unreadCount;
      }
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-surface text-on-surface">
      <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-full bg-primary px-4 py-2 font-semibold text-white shadow-lg transition focus:translate-y-0">Lewati ke konten utama</a>
      <SiteHeader session={session} unreadCount={unreadCount} />
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 ${flushHeader ? "pt-0" : "pt-14 md:pt-16"} ${withBottomNavPad ? "pb-20 md:pb-0" : ""}`}
      >
        {children}
      </main>
      {showFooter ? <SiteFooter /> : null}
      <BottomNav />
    </div>
  );
}

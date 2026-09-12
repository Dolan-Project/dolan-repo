import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { Icon } from "@/components/ui/Icon";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-surface text-on-surface">
      <header className="px-margin py-5 md:px-margin-desktop">
        <Link href={ROUTES.beranda} className="inline-flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm">
            <Icon name="explore" className="text-[22px]" />
          </span>
          <span className="flex flex-col">
            <span className="type-subtitle leading-none tracking-tight text-on-surface">
              DOLAN
            </span>
            <span className="type-micro mt-0.5 text-on-surface-variant">
              Social Travel untuk Indonesia
            </span>
          </span>
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-margin pb-16 md:px-0">
        <div className="card-surface flex flex-col gap-6 p-6 md:p-10">{children}</div>
      </main>
    </div>
  );
}

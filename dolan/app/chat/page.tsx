import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { TripChatInbox } from "@/components/chat/TripChatInbox";
import { DolanWordmark } from "@/components/brand/DolanWordmark";
import { ROUTES } from "@/lib/routes";

export default async function ChatInboxPage() {
  const session = await getSession();
  if (!session) redirect(`${ROUTES.masuk}?next=${encodeURIComponent(ROUTES.chats)}`);
  return (
    <div className="fixed inset-0 z-[60] bg-surface md:grid md:grid-cols-[300px_minmax(0,1fr)]">
      <TripChatInbox />
      <section className="hidden place-items-center p-10 text-center md:grid">
        <div className="rounded-[2rem] border border-sky-100 bg-white px-10 py-12 shadow-[0_16px_40px_rgba(15,59,94,.08)]">
          <div className="mx-auto w-fit">
            <DolanWordmark height={44} />
          </div>
          <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.16em] text-primary">Room chat trip</p>
          <h1 className="mt-2 text-2xl font-extrabold text-on-surface">Pilih percakapan di kiri</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
            Setiap trip punya room-nya sendiri. Koordinasi rute, jam kumpul, dan update perjalanan tanpa menu situs yang ramai.
          </p>
        </div>
      </section>
    </div>
  );
}

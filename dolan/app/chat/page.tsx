import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { TripChatShell } from "@/components/chat/TripChatShell";
import { ROUTES } from "@/lib/routes";

export default async function ChatInboxPage() {
  const session = await getSession();
  if (!session) redirect(`${ROUTES.masuk}?next=${encodeURIComponent(ROUTES.chats)}`);
  return <TripChatShell />;
}

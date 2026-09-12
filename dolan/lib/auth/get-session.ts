import { cookies } from "next/headers";
import type { AuthSession } from "@/lib/contracts";
import { handleGetMeRequest } from "./handle-profile";
import { SESSION_COOKIE } from "./session-cookie";

export async function getSession(): Promise<AuthSession | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const response = await handleGetMeRequest(
    new Request("http://localhost/api/v1/users/me", {
      headers: { cookie: `${SESSION_COOKIE}=${sessionId}` },
    }),
  );
  const json = (await response.json()) as
    | { success: true; data: AuthSession }
    | { success: false };
  return json.success ? json.data : null;
}

import { cookies } from "next/headers";
import type { AuthSession } from "@/lib/contracts";
import { profileRouteHandlers } from "./adapter";
import { SESSION_COOKIE } from "./session-cookie";

export async function getSession(): Promise<AuthSession | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  const parts = jar
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  const response = await profileRouteHandlers.me.GET(
    new Request("http://localhost/api/v1/users/me", {
      headers: parts ? { cookie: parts } : sessionId
        ? { cookie: `${SESSION_COOKIE}=${sessionId}` }
        : {},
    }),
  );
  const json = (await response.json()) as
    | { success: true; data: AuthSession }
    | { success: false };
  return json.success ? json.data : null;
}

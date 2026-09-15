import { cookies } from "next/headers";
import type { AuthSession, PublicUser } from "@/lib/contracts";
import { profileRouteHandlers } from "./adapter";
import { SESSION_COOKIE } from "./session-cookie";

async function cookieHeader(): Promise<string> {
  const jar = await cookies();
  return jar
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");
}

export async function getSession(): Promise<AuthSession | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  const parts = await cookieHeader();

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

export async function getPublicProfile(username: string): Promise<PublicUser | null> {
  const parts = await cookieHeader();
  const path = `/api/v1/users/${encodeURIComponent(username)}`;
  const response = await profileRouteHandlers.byUsername(
    new Request(`http://localhost${path}`, {
      headers: parts ? { cookie: parts } : {},
    }),
    username,
  );
  const json = (await response.json()) as
    | { success: true; data: PublicUser }
    | { success: false };
  return json.success ? json.data : null;
}

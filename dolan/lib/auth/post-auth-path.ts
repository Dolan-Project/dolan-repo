import {
  resolvePostAuthPath,
  type AuthSession,
} from "@/lib/contracts";

function withNext(path: string, next: string | undefined | null): string {
  const dest = resolvePostAuthPath(next);
  if (dest === "/") return path;
  return `${path}?next=${encodeURIComponent(dest)}`;
}

export function resolveAfterAuth(
  session: AuthSession,
  next?: string | null,
): string {
  if (!session.profileComplete) return withNext("/profil/edit", next);
  return resolvePostAuthPath(next);
}

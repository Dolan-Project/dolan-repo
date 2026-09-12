"use client";

import { AUTH_PATHS } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await fetch(AUTH_PATHS.logout, { method: "POST", credentials: "include" });
    router.push(ROUTES.beranda);
    router.refresh();
  }

  return (
    <button
      type="button"
      className="btn-ghost !min-h-11"
      disabled={pending}
      onClick={() => void onClick()}
    >
      <Icon name="logout" className="text-[18px]" />
      {pending ? "Memproses…" : "Keluar"}
    </button>
  );
}

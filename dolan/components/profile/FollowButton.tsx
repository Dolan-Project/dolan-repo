"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FollowButtonProps = {
  username: string;
  compact?: boolean;
};

export function FollowButton({ username, compact = false }: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/v1/users/${encodeURIComponent(username)}/follow`, {
      method: following ? "DELETE" : "POST",
      credentials: "include",
    });
    const json = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };
    setPending(false);
    if (!json.success) {
      setMessage(json.error?.message ?? "Tidak bisa follow sekarang");
      return;
    }
    setFollowing((value) => !value);
    router.refresh();
  }

  const label = pending ? "…" : following ? "Mengikuti" : compact ? "Ikuti" : "Follow";

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        className={
          compact
            ? following
              ? "rounded-full border border-outline-variant px-3 py-1 text-[11px] font-bold text-on-surface-variant"
              : "rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white"
            : following
              ? "btn-secondary !min-h-11"
              : "btn-brand !min-h-11"
        }
        disabled={pending}
        onClick={() => void onClick()}
      >
        {label}
      </button>
      {message && !compact ? (
        <p className="max-w-[16rem] type-caption text-error">{message}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FollowButtonProps = {
  username: string;
};

export function FollowButton({ username }: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/v1/users/${username}/follow`, {
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

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        className={following ? "btn-secondary !min-h-11" : "btn-brand !min-h-11"}
        disabled={pending}
        onClick={() => void onClick()}
      >
        {pending ? "Memproses…" : following ? "Mengikuti" : "Follow"}
      </button>
      {message ? (
        <p className="max-w-[16rem] type-caption text-error">{message}</p>
      ) : null}
    </div>
  );
}

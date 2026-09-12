"use client";

import { useState } from "react";

export function FollowButton() {
  const [following, setFollowing] = useState(false);

  return (
    <button
      type="button"
      className={following ? "btn-secondary !min-h-11" : "btn-brand !min-h-11"}
      onClick={() => setFollowing((value) => !value)}
    >
      {following ? "Mengikuti" : "Follow"}
    </button>
  );
}

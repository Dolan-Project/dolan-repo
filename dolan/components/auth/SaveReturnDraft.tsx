"use client";

import { SAFE_DRAFT_STORAGE_KEY } from "@/lib/contracts";
import { useEffect } from "react";

export function SaveReturnDraft({ path }: { path: string }) {
  useEffect(() => {
    sessionStorage.setItem(
      SAFE_DRAFT_STORAGE_KEY,
      JSON.stringify({ path, savedAt: Date.now() }),
    );
  }, [path]);
  return null;
}

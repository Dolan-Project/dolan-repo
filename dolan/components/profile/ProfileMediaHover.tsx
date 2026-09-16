"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { API_V1_PREFIX, EXPRESS_PATHS, type ApiError } from "@/lib/contracts";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";

type ProfileMediaHoverProps = {
  kind: "avatar" | "cover";
  src: string | null;
  fallbackSrc?: string | null;
  alt: string;
  canEdit: boolean;
  className?: string;
};

export function ProfileMediaHover({
  kind,
  src,
  fallbackSrc = null,
  alt,
  canEdit,
  className = "",
}: ProfileMediaHoverProps) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(src);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPreview(src);
  }, [src]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!viewerOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setViewerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewerOpen]);

  const shownSrc = preview || fallbackSrc;
  const viewSrc = preview || fallbackSrc;
  const isCover = kind === "cover";

  async function upload(file: File) {
    setPending(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    const path =
      kind === "avatar"
        ? `${API_V1_PREFIX}${EXPRESS_PATHS.usersMeAvatar}`
        : `${API_V1_PREFIX}${EXPRESS_PATHS.usersMeCover}`;
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const json = (await response.json()) as
      | { success: true; data: { avatarUrl?: string; coverUrl?: string } }
      | ApiError;
    setPending(false);
    if (!json.success) {
      setError(json.error.message);
      setMenuOpen(true);
      return;
    }
    const nextUrl = kind === "avatar" ? json.data.avatarUrl : json.data.coverUrl;
    if (nextUrl) setPreview(nextUrl);
    setMenuOpen(false);
    router.refresh();
  }

  function openViewer() {
    setMenuOpen(false);
    setViewerOpen(true);
  }

  function openFilePicker() {
    setMenuOpen(false);
    inputRef.current?.click();
  }

  return (
    <>
      <div
        ref={rootRef}
        className={`group relative ${className}`}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button, label")) return;
          if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
          setMenuOpen((open) => !open);
        }}
      >
        {isCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={alt} className="h-full w-full object-cover" src={shownSrc ?? undefined} />
        ) : (
          <UserAvatar
            src={preview}
            alt={alt}
            className="h-full w-full"
            iconClassName="text-[56px]"
          />
        )}
        {isCover ? (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071c32]/55 via-transparent to-transparent" />
        ) : null}

        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#071c32]/55 px-3 opacity-0 pointer-events-none backdrop-blur-[2px] transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 ${
            menuOpen ? "pointer-events-auto opacity-100" : ""
          }`}
        >
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 type-micro font-bold text-on-surface shadow-sm hover:bg-primary-fixed"
            onClick={openViewer}
          >
            <Icon name="visibility" className="text-[15px] text-primary" />
            Lihat foto
          </button>
          {canEdit ? (
            <button
              type="button"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 type-micro font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
              disabled={pending}
              onClick={openFilePicker}
            >
              <Icon name="photo_camera" className="text-[15px]" />
              {pending ? "Mengunggah…" : "Edit foto"}
            </button>
          ) : null}
          {error ? (
            <p className="max-w-[90%] rounded-full bg-error-container px-3 py-1 text-center type-micro font-semibold text-on-error-container" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {canEdit ? (
          <span className="pointer-events-none absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md group-hover:opacity-0">
            <Icon name="photo_camera" className="text-[16px]" />
          </span>
        ) : null}

        {canEdit ? (
          <label htmlFor={inputId} className="sr-only">
            Unggah {isCover ? "foto sampul" : "foto profil"}
          </label>
        ) : null}
        <input
          id={inputId}
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>

      {viewerOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-[#071c32]/80 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              onClick={() => setViewerOpen(false)}
            >
              <button
                type="button"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-on-surface"
                aria-label="Tutup"
                onClick={() => setViewerOpen(false)}
              >
                <Icon name="close" className="text-[20px]" />
              </button>
              <div className="max-h-[90vh] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
                {viewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={alt}
                    src={viewSrc}
                    className={`max-h-[90vh] max-w-[90vw] object-contain shadow-2xl ${
                      isCover ? "rounded-2xl" : "rounded-3xl"
                    }`}
                  />
                ) : (
                  <div className="flex h-64 w-64 items-center justify-center rounded-3xl bg-surface-container-high text-on-surface-variant">
                    <Icon name="person" className="text-[96px]" />
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

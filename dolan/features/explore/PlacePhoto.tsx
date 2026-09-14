"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getPlacePhoto } from "./api";

type PlacePhotoProps = {
  googlePlaceId: string;
  photoName: string | null;
  /** Seeded / cached permanent URL — skip Google Places media request. */
  photoUri?: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
};

export function PlacePhoto({
  googlePlaceId,
  photoName,
  photoUri = null,
  alt,
  className = "",
  eager = false,
}: PlacePhotoProps) {
  const requestKey = `${googlePlaceId}:${photoUri ?? photoName ?? "fallback"}`;
  const [photo, setPhoto] = useState<{ key: string; src: string | null; failed: boolean }>({
    key: photoUri ? requestKey : "",
    src: photoUri,
    failed: false,
  });

  useEffect(() => {
    if (photoUri) {
      setPhoto({ key: requestKey, src: photoUri, failed: false });
      return;
    }
    if (!photoName) return;
    let active = true;
    getPlacePhoto(googlePlaceId, photoName)
      .then((media) => active && setPhoto({ key: requestKey, src: media.photoUri, failed: false }))
      .catch(() => active && setPhoto({ key: requestKey, src: null, failed: true }));
    return () => {
      active = false;
    };
  }, [googlePlaceId, photoName, photoUri, requestKey]);

  const src = photo.key === requestKey ? photo.src : null;
  const failed = (!photoName && !photoUri) || (photo.key === requestKey && photo.failed);

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-primary-fixed to-tertiary-fixed ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={alt}
          className="h-full w-full object-cover"
          loading={eager ? "eager" : "lazy"}
          onError={() => setPhoto({ key: requestKey, src: null, failed: true })}
          src={src}
        />
      ) : failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary-fixed via-white to-tertiary-fixed px-3 text-center text-primary/60">
          <Icon name="landscape" className="text-[30px]" />
          <span className="mt-1 line-clamp-1 type-micro">Foto {alt} belum tersedia</span>
        </div>
      ) : (
        <div className="flex h-full w-full animate-pulse items-center justify-center text-primary/45">
          <Icon name="image" className="text-[28px]" />
        </div>
      )}
    </div>
  );
}

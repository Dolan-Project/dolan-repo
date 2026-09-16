"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PlacePhoto } from "@/features/explore/PlacePhoto";
import { fetchDestinationCover, hasCoverPhoto } from "@/lib/destination-cover";
import type { PlaceSummary } from "@dolan/shared";

export function TripCoverImage({
  place,
  destinationCity,
  title,
  className = "",
  imgClassName = "h-full w-full object-cover",
  eager = false,
}: {
  place?: PlaceSummary | null;
  destinationCity?: string | null;
  title: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const [resolved, setResolved] = useState<PlaceSummary | null>(hasCoverPhoto(place) ? place ?? null : null);

  useEffect(() => {
    if (hasCoverPhoto(place)) {
      setResolved(place ?? null);
      return;
    }
    const query = destinationCity?.trim();
    if (!query) {
      setResolved(null);
      return;
    }
    const controller = new AbortController();
    void fetchDestinationCover(query, controller.signal).then((cover) => {
      if (!controller.signal.aborted) setResolved(hasCoverPhoto(cover) ? cover : null);
    });
    return () => controller.abort();
  }, [destinationCity, place]);

  if (hasCoverPhoto(resolved)) {
    return (
      <PlacePhoto
        googlePlaceId={resolved!.googlePlaceId}
        photoName={resolved!.photoName}
        photoUri={resolved!.photoUri}
        alt={title}
        eager={eager}
        className={className}
      />
    );
  }

  return (
    <div className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary-fixed via-white to-tertiary-fixed px-3 text-center text-primary/70 ${imgClassName} ${className}`.trim()}>
      <Icon name="landscape" className="text-[30px]" />
      <span className="mt-1 line-clamp-2 type-micro font-bold">{destinationCity || title}</span>
    </div>
  );
}

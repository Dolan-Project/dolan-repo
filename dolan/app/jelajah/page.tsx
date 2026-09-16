import { ExploreExperience } from "@/features/explore/ExploreExperience";
import { Suspense } from "react";

export default function JelajahPage() {
  return (
    <Suspense fallback={<div className="grid min-h-[50vh] place-items-center type-body text-on-surface-variant">Memuat jelajah…</div>}>
      <ExploreExperience />
    </Suspense>
  );
}

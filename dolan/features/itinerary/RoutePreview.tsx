import type { EditableItineraryDay } from "@dolan/shared";
import { Icon } from "@/components/ui/Icon";
import { GoogleMap } from "@/features/explore/GoogleMap";

export function RoutePreview({ days }: { days: EditableItineraryDay[] }) {
  const stops = days.flatMap((day) => day.stops);
  const totalTravel = stops.reduce((sum, stop) => sum + (stop.travelDurationMinutes ?? 0), 0);
  const points = stops.flatMap((stop) => stop.place ? [{ id: stop.id, label: stop.place.name, lat: stop.place.latitude, lng: stop.place.longitude }] : []);

  return (
    <aside className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-[#d7ebed] shadow-[0_20px_55px_rgba(15,40,70,.16)] lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
      <div className="relative min-h-[350px] h-full overflow-hidden">
        <GoogleMap points={points} selectedId={null} onSelect={() => undefined} showRoute className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#071c32]/20" />
        <div className="absolute left-4 right-4 top-4 rounded-2xl border border-white/60 bg-white/88 p-4 shadow-lg backdrop-blur-md">
          <p className="type-micro uppercase tracking-wider text-secondary">Route overview</p>
          <h2 className="type-subtitle mt-1">Labuan Bajo → Kepulauan Komodo</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
            <span className="chip bg-primary-fixed"><Icon name="location_on" /> {stops.length} destinasi</span>
            <span className="chip bg-secondary-fixed"><Icon name="schedule" /> {Math.round(totalTravel / 60)} jam perjalanan</span>
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-[#071c32]/88 p-4 text-white backdrop-blur-md">
          <p className="type-label">Rute mengikuti urutan itinerary</p>
          <p className="type-caption mt-1 text-white/70">Garis menghubungkan segmen antarpulau. Rute navigasi final dihitung Routes API saat wiring backend.</p>
        </div>
      </div>
    </aside>
  );
}

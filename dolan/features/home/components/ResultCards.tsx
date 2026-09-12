import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";
import type { ItineraryTemplateResult, PlaceResult, TripResult } from "../types";

function Cover({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105" />;
}

export function PlaceCard({ place }: { place: PlaceResult }) {
  return <Link href={ROUTES.jelajah} className="group overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm"><div className="overflow-hidden"><Cover src={place.imageUrl} alt={place.name} /></div><div className="p-4"><span className="text-xs font-bold text-sky-700">{place.category}</span><h3 className="mt-1 font-bold text-slate-900">{place.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Icon name="star" filled className="text-amber-400" /> {place.rating} · {place.reviewCount.toLocaleString("id-ID")} ulasan</p></div></Link>;
}

export function TripCard({ trip }: { trip: TripResult }) {
  return <Link href={ROUTES.jelajah} className="group overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm"><div className="overflow-hidden"><Cover src={trip.imageUrl} alt={trip.title} /></div><div className="p-4"><div className="flex gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Join gratis</span><span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700">{trip.dateLabel}</span></div><h3 className="mt-2 font-bold text-slate-900">{trip.title}</h3><p className="mt-1 text-xs text-slate-500">{trip.city} · Sisa {trip.seatsLeft} kursi</p></div></Link>;
}

export function ItineraryTemplateCard({ template }: { template: ItineraryTemplateResult }) {
  return <Link href={ROUTES.itineraryBali} className="group overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm"><div className="relative overflow-hidden"><Cover src={template.imageUrl} alt={template.title} /><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-sky-800 shadow-sm backdrop-blur">{template.curated ? "Kurasi Dolan" : "Populer di Dolan"}</span></div><div className="p-4"><h3 className="font-bold text-slate-900">{template.title}</h3><p className="mt-1 text-xs text-slate-500">{template.durationDays} hari · Dipakai {template.usageCount.toLocaleString("id-ID")} pejalan</p></div></Link>;
}

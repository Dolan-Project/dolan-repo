import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";
import type { ItineraryTemplateResult, PlaceResult, TripResult } from "../types";

function Cover({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />;
}

export function PlaceCard({ place }: { place: PlaceResult }) {
  return (
    <Link href={`/wisata/${encodeURIComponent(place.id)}`} className="group grid min-h-44 grid-cols-[190px_1fr] overflow-hidden rounded-[24px] border border-white bg-gradient-to-br from-white to-sky-50/70 shadow-[0_14px_38px_rgba(29,78,116,0.12)] ring-1 ring-sky-100/80 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(29,78,116,0.18)] max-[520px]:grid-cols-[118px_1fr]">
      <div className="relative overflow-hidden bg-sky-100"><Cover src={place.imageUrl} alt={place.name} /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent"/><span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.1em] text-sky-800 shadow-md backdrop-blur-md max-[520px]:hidden">Tempat wisata</span></div>
      <div className="flex min-w-0 flex-col border-l-4 border-sky-400 p-5 max-[520px]:p-4"><span className="flex items-center gap-1 text-[11px] font-bold text-sky-700"><Icon name="location_on" filled />{place.city}</span><h3 className="mt-1.5 text-xl font-extrabold leading-tight text-slate-900 max-[520px]:text-base">{place.name}</h3><p className="mt-2 w-fit rounded-full bg-sky-100/80 px-2.5 py-1 text-[10px] font-bold text-sky-800">{place.category}</p><div className="mt-auto flex items-center justify-between gap-3 pt-4"><p className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 shadow-sm"><Icon name="star" filled className="text-amber-400" /><b className="text-slate-800">{place.rating}</b><span className="max-[520px]:hidden">· {place.reviewCount.toLocaleString("id-ID")} ulasan</span></p><span className="flex items-center gap-1 rounded-full bg-blue-600 px-3 py-2 text-xs font-extrabold text-white shadow-md shadow-blue-200">Detail <Icon name="arrow_forward" /></span></div></div>
    </Link>
  );
}

export function TripCard({ trip }: { trip: TripResult }) {
  return (
    <Link href={ROUTES.trip(trip.id)} className="group grid min-h-44 grid-cols-[190px_1fr] overflow-hidden rounded-[24px] border border-white bg-gradient-to-br from-white to-orange-50/60 shadow-[0_14px_38px_rgba(29,78,116,0.12)] ring-1 ring-orange-100/80 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(29,78,116,0.18)] max-[520px]:grid-cols-[118px_1fr]">
      <div className="relative overflow-hidden bg-orange-100"><Cover src={trip.imageUrl} alt={trip.title} /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"/><span className="absolute left-3 top-3 rounded-full border border-white/70 bg-orange-500/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.1em] text-white shadow-md backdrop-blur-md max-[520px]:hidden">Trip publik</span></div>
      <div className="flex min-w-0 flex-col border-l-4 border-orange-400 p-5 max-[520px]:p-4"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">Join gratis</span><span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-extrabold text-sky-700">{trip.dateLabel}</span></div><h3 className="mt-2.5 text-xl font-extrabold leading-tight text-slate-900 max-[520px]:text-base">{trip.title}</h3><p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-slate-500"><Icon name="location_on" filled />{trip.city}</p><div className="mt-auto flex items-center justify-between gap-3 pt-3"><span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm"><Icon name="group" />Sisa {trip.seatsLeft} slot</span><span className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-2 text-xs font-extrabold text-white shadow-md shadow-orange-200">Lihat trip <Icon name="arrow_forward" /></span></div></div>
    </Link>
  );
}

export function ItineraryTemplateCard({ template }: { template: ItineraryTemplateResult }) {
  return <Link href={`${ROUTES.buatTrip}?templateId=${encodeURIComponent(template.id)}`} className="group overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm"><div className="relative h-36 overflow-hidden"><Cover src={template.imageUrl} alt={template.title} /><span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-sky-800 shadow-sm backdrop-blur">{template.curated ? "Kurasi Dolan" : "Populer di Dolan"}</span></div><div className="p-4"><h3 className="font-bold text-slate-900">{template.title}</h3><p className="mt-1 text-xs text-slate-500">{template.durationDays} hari · Dipakai {template.usageCount.toLocaleString("id-ID")} pejalan</p></div></Link>;
}

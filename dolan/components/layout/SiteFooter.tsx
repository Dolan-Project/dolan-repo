import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

export function SiteFooter() {
  return (
    <footer className="border-t border-sky-100 bg-gradient-to-br from-[#eaf7ff] via-white to-[#fff2e8] text-slate-900">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-12 md:grid-cols-[1.35fr_.7fr_.8fr_1fr] md:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Dolan Logo" className="h-8 w-auto rounded-lg bg-white p-1 object-contain" src={ASSETS.logo}/>
            <span className="text-xl font-extrabold">Dolan</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">Temukan tujuan, susun itinerary, dan kenalan dengan traveler yang punya rencana perjalanan serupa.</p>
          <div className="mt-5 flex gap-2">
            {["photo_camera","smart_display","alternate_email"].map((icon)=><a key={icon} href="#" aria-label={`Media sosial ${icon}`} className="grid h-10 w-10 place-items-center rounded-full border border-sky-100 bg-white/80 text-sky-700 shadow-sm transition hover:-translate-y-1 hover:bg-white"><Icon name={icon}/></a>)}
          </div>
        </div>
        <div><h3 className="text-sm font-extrabold">Jelajahi</h3><div className="mt-4 grid gap-3 text-sm text-slate-600"><Link href={ROUTES.jelajah}>Destinasi</Link><Link href={ROUTES.jelajah}>Trip publik</Link><Link href={ROUTES.buatTrip}>Buat itinerary</Link><Link href={ROUTES.profil}>Komunitas</Link></div></div>
        <div><h3 className="text-sm font-extrabold">Dukungan</h3><div className="mt-4 grid gap-3 text-sm text-slate-600"><a href="#faq">FAQ</a><a href="#">Pusat bantuan</a><a href="#">Keamanan</a><a href="#">Privasi</a></div></div>
        <div><h3 className="text-sm font-extrabold">Temui kami</h3><p className="mt-4 flex gap-2 text-sm leading-6 text-slate-600"><Icon name="location_on" className="mt-0.5 text-sky-300"/>Jl. Malioboro No. 88,<br/>Yogyakarta 55271</p><p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><Icon name="mail" className="text-sky-300"/>halo@dolan.id</p></div>
      </div>
      <div className="border-t border-sky-100 px-6 py-5 text-center text-xs text-slate-500">© 2026 Dolan Indonesia · Dibuat untuk perjalanan yang lebih bermakna.</div>
    </footer>
  );
}

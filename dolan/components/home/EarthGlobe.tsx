import { ASSETS } from "@/lib/assets";

export function EarthGlobe() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-[-4rem] z-10 hidden h-[640px] w-[640px] -translate-y-1/2 lg:block xl:left-[-1.5rem] xl:h-[780px] xl:w-[780px]"
    >
      <div className="absolute -inset-6 rounded-full bg-tertiary-fixed/40 blur-3xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        src={ASSETS.globe}
        className="relative z-10 h-full w-full rounded-full object-cover drop-shadow-[0_20px_50px_rgba(16,36,58,0.18)]"
      />
      <div className="absolute top-[30%] left-[62%] z-20 hidden items-center gap-1.5 rounded-full bg-surface-container-lowest/95 px-3 py-1.5 shadow-md backdrop-blur-md lg:flex">
        <span className="h-2 w-2 rounded-full bg-secondary-container" />
        <span className="type-micro text-on-surface">Labuan Bajo · 8 kawan aktif</span>
      </div>
      <div className="absolute bottom-[32%] left-[42%] z-20 hidden items-center gap-1.5 rounded-full bg-surface-container-lowest/95 px-3 py-1.5 shadow-md backdrop-blur-md lg:flex">
        <span className="h-2 w-2 rounded-full bg-primary-container" />
        <span className="type-micro text-on-surface">Bromo · Semeru</span>
      </div>
    </div>
  );
}

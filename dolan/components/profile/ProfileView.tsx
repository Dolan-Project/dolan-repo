/* eslint-disable @next/next/no-img-element */
import type { PublicUser } from "@/lib/contracts";
import Link from "next/link";
import { FollowButton } from "@/components/profile/FollowButton";
import { BlockReportActions } from "@/components/profile/BlockReportActions";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

type ProfileViewProps = { user: PublicUser; action: "edit" | "follow" };

export function ProfileView({ user, action }: ProfileViewProps) {
  const avatar = user.avatarUrl ?? ASSETS.profile;
  const cover = user.coverUrl ?? ASSETS.komodo;
  const tripTotal = user.hostTripCount + user.participantTripCount;
  const rating = user.rating.overall != null ? user.rating.overall.toFixed(2) : "—";

  return (
    <main className="mx-auto max-w-[1180px] px-margin pb-10 pt-4 md:px-margin-desktop md:pb-14 md:pt-6">
      <section className="relative rounded-[2rem] border border-outline-variant/50 bg-white p-3 shadow-[0_16px_45px_rgba(22,48,80,.09)] sm:p-4">
        <div className="relative h-52 w-full overflow-hidden rounded-[1.75rem] bg-surface-container-highest sm:h-72 lg:h-80">
          <img alt="Foto latar profil traveler" className="h-full w-full object-cover" src={cover} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071c32]/55 via-transparent to-transparent" />
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 type-micro font-semibold text-white backdrop-blur-md">
            <Icon name="photo_camera" className="text-[14px]" />
            Cerita perjalanan
          </span>
          {action === "edit" ? (
            <Link
              href={ROUTES.profilEdit}
              className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/55 px-3 py-2 type-micro font-semibold text-white backdrop-blur-md"
            >
              <Icon name="photo_camera" className="text-[14px]" />
              Ganti Sampul
            </Link>
          ) : null}
        </div>

        <div className="relative px-1 pb-3 sm:px-6 sm:pb-4">
          <div className="flex flex-col justify-between gap-4 pt-4 lg:flex-row lg:items-end">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <div className="-mt-16 shrink-0 sm:-mt-24">
                <div className="h-28 w-28 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl sm:h-36 sm:w-36">
                  <img alt={`Foto profil ${user.displayName}`} className="h-full w-full object-cover" src={avatar} />
                </div>
                <span className="-mt-3 ml-2 inline-flex items-center gap-1.5 rounded-full bg-[#087f8c] px-3 py-1 type-micro font-bold text-white shadow-md">
                  <Icon name="verified" className="text-[12px]" />
                  Traveler Terverifikasi
                </span>
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-black tracking-tight text-on-surface sm:text-3xl">
                  {user.displayName || "Traveler Dolan"}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                  <span className="rounded-full bg-primary-fixed px-2.5 py-0.5 type-micro font-bold text-primary">
                    {user.username ? `@${user.username}` : "Username belum diatur"}
                  </span>
                  <span className="flex items-center gap-1 type-caption font-medium text-on-surface-variant">
                    <Icon name="location_on" className="text-[15px] text-primary" />
                    {user.domicile || "Domisili belum diisi"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pb-1">
              {action === "edit" ? (
                <>
                  <Link href={ROUTES.profilEdit} className="btn-primary !min-h-11">
                    <Icon name="edit" className="text-[16px]" />
                    Edit Profil
                  </Link>
                  <LogoutButton />
                </>
              ) : user.username ? (
                <FollowButton username={user.username} />
              ) : null}
            </div>
          </div>

          <p className="mt-5 max-w-4xl type-body-lg text-on-surface-variant">
            {user.bio ||
              "Bagikan gaya traveling, daerah favorit, dan tipe teman perjalanan yang kamu cari."}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              icon="hiking"
              iconClass="bg-secondary-fixed text-secondary"
              title={`${tripTotal} Trip`}
              subtitle={`${user.hostTripCount} Host · ${user.participantTripCount} Peserta`}
            />
            <StatTile
              href={user.username ? ROUTES.profilPengikut(user.username) : undefined}
              icon="groups"
              iconClass="bg-primary-fixed text-primary"
              title={`${user.followersCount + user.followingCount} Teman`}
              subtitle={`${user.followersCount} Pengikut · ${user.followingCount} Mengikuti`}
            />
            <StatTile
              href={user.username ? ROUTES.profilUlasan(user.username) : undefined}
              icon="star"
              iconClass="bg-amber-100 text-amber-600"
              title={`${rating} Rating`}
              subtitle={`${user.rating.reviewCount} ulasan rekan trip`}
            />
            <StatTile
              href={user.username ? ROUTES.profilRiwayat(user.username) : undefined}
              icon="verified_user"
              iconClass="bg-emerald-100 text-emerald-700"
              title="Riwayat publik"
              subtitle="Trip selesai yang diizinkan tampil"
            />
          </div>

          {user.username ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={ROUTES.profilPengikut(user.username)} className="btn-ghost !min-h-11">
                Pengikut
              </Link>
              <Link href={ROUTES.profilMengikuti(user.username)} className="btn-ghost !min-h-11">
                Mengikuti
              </Link>
              <Link href={ROUTES.profilUlasan(user.username)} className="btn-ghost !min-h-11">
                Ulasan
              </Link>
              <Link href={ROUTES.profilRiwayat(user.username)} className="btn-ghost !min-h-11">
                Riwayat
              </Link>
              {action === "edit" ? (
                <Link href={ROUTES.adminLaporan} className="btn-ghost !min-h-11">
                  Moderasi laporan
                </Link>
              ) : null}
            </div>
          ) : null}

          {action === "follow" && user.username ? (
            <div className="mt-5 rounded-2xl border border-primary/10 bg-surface-container-low p-4">
              <p className="type-label font-extrabold text-on-surface">Keamanan komunitas</p>
              <p className="type-caption mt-1 text-on-surface-variant">
                Blokir menghapus follow dan mencegah follow atau join. Laporan masuk ke antrian admin.
              </p>
              <div className="mt-3">
                <BlockReportActions username={user.username} targetUserId={user.id} />
              </div>
            </div>
          ) : null}

          <p className="mt-2.5 flex items-center gap-1.5 type-micro italic text-on-surface-variant">
            <Icon name="info" className="text-[12px] text-primary" />
            Statistik di atas hanya menghitung trip publik. Trip private dan draft tidak dipublikasikan.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[.75fr_1.55fr]">
        <div className="rounded-3xl border border-outline-variant/50 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="type-micro font-extrabold uppercase tracking-widest text-on-surface-variant">
              DolanScore & Trust
            </p>
            <span className="chip bg-emerald-100 text-emerald-800">
              <Icon name="verified" /> Rekan Terpercaya
            </span>
          </div>
          <div className="mt-4 rounded-2xl bg-surface-container-low p-5 text-center ring-1 ring-primary/10">
            <div className="flex items-baseline justify-center gap-1">
              <Icon name="star" className="text-3xl text-amber-500" />
              <span className="text-5xl font-black tracking-tight text-on-surface">{rating}</span>
              <span className="text-lg font-bold text-on-surface-variant">/ 5.0</span>
            </div>
            <p className="mt-2 type-caption text-on-surface-variant">
              {user.rating.reviewCount > 0
                ? `Berdasarkan ${user.rating.reviewCount} ulasan sesama rekan satu perjalanan`
                : "Belum ada ulasan"}
            </p>
          </div>
          <div className="mt-4 space-y-2.5">
            <TrustLine text="Rating hanya berasal dari peserta satu trip yang telah selesai" />
            <TrustLine text="Riwayat publik membantu calon teman perjalanan mengenal traveler" />
          </div>
        </div>
        <div className="rounded-3xl border border-outline-variant/50 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 pb-4">
            <div>
              <h2 className="type-subtitle">Penilaian dari Rekan Seperjalanan</h2>
              <p className="mt-1 type-caption text-on-surface-variant">
                Nilai komunikasi dan sikap setelah menyelesaikan trip bersama.
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-primary">
              <Icon name="monitoring" />
            </span>
          </div>
          <div className="mt-5 space-y-6">
            <RatingBar icon="forum" label="Komunikasi & Koordinasi" value={user.rating.communication} />
            <RatingBar icon="sentiment_satisfied" label="Sikap Ramah & Kebersamaan" value={user.rating.attitude} />
          </div>
          <p className="mt-6 rounded-2xl border border-dashed border-primary/25 bg-surface-container-low px-4 py-3 type-caption text-on-surface-variant">
            <Icon name="link" className="mr-1 text-primary" />
            Setiap ulasan ditautkan ke trip publik yang benar-benar diikuti bersama.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
          <h2 className="type-subtitle">
            <Icon name="explore" className="mr-2 text-primary" />
            Riwayat Trip Publik
          </h2>
          <span className="type-caption text-on-surface-variant">{tripTotal} perjalanan</span>
        </div>
        {tripTotal > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <HistoryCard image={ASSETS.komodo} place="Pulau Padar & Komodo" role="Host perjalanan" />
            <HistoryCard image={ASSETS.tanahLot} place="Pesisir Bali" role="Peserta perjalanan" />
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-6 py-10 text-center">
            <Icon name="luggage" className="text-4xl text-primary" />
            <p className="mt-2 type-label">Belum ada riwayat trip publik</p>
            <p className="mt-1 type-caption text-on-surface-variant">
              Trip selesai yang diizinkan tampil akan muncul di sini.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function StatTile({
  icon,
  iconClass,
  title,
  subtitle,
  href,
}: {
  icon: string;
  iconClass: string;
  title: string;
  subtitle: string;
  href?: string;
}) {
  const content = (
    <div className="flex min-h-24 items-center gap-3 rounded-2xl bg-surface-container-low p-3 sm:p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon name={icon} className="text-[21px]" />
      </div>
      <div>
        <p className="type-label font-extrabold text-on-surface">{title}</p>
        <p className="mt-0.5 type-caption text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  );
  if (!href) return content;
  return (
    <Link
      href={href}
      className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {content}
    </Link>
  );
}

function TrustLine({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 type-caption text-on-surface-variant">
      <Icon name="check_circle" className="mt-0.5 text-emerald-600" />
      {text}
    </p>
  );
}

function RatingBar({ icon, label, value }: { icon: string; label: string; value: number | null }) {
  const score = value ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="type-label text-on-surface">
          <Icon name={icon} className="mr-2 text-primary" />
          {label}
        </span>
        <strong className="type-label">
          {value == null ? "—" : value.toFixed(1)}{" "}
          <span className="font-normal text-on-surface-variant">/ 5.0</span>
        </strong>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-container-high">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-secondary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, score * 20))}%` }}
        />
      </div>
    </div>
  );
}

function HistoryCard({ image, place, role }: { image: string; place: string; role: string }) {
  return (
    <article className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-outline-variant/50">
      <img src={image} alt={place} className="h-24 w-32 rounded-xl object-cover" />
      <div className="min-w-0 py-1">
        <span className="chip bg-emerald-50 text-emerald-800">Trip selesai</span>
        <h3 className="mt-2 type-label font-extrabold">{place}</h3>
        <p className="mt-1 type-caption text-on-surface-variant">{role}</p>
      </div>
    </article>
  );
}

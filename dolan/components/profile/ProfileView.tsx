import type { PublicUser } from "@/lib/contracts";
import Link from "next/link";
import { FollowButton } from "@/components/profile/FollowButton";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

type ProfileViewProps = {
  user: PublicUser;
  action: "edit" | "follow";
};

export function ProfileView({ user, action }: ProfileViewProps) {
  const avatar = user.avatarUrl ?? ASSETS.profile;
  const tripTotal = user.hostTripCount + user.participantTripCount;
  const rating =
    user.rating.overall != null ? user.rating.overall.toFixed(2) : "—";

  return (
    <div className="mx-auto max-w-[960px] px-margin py-6 md:px-margin-desktop md:py-8">
      <section className="card-surface relative overflow-hidden p-4 sm:p-6">
        <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-surface-container-highest sm:h-72">
          {user.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="h-full w-full object-cover"
              src={user.coverUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center type-caption text-on-surface-variant">
              Belum ada foto cover
            </div>
          )}
          {action === "edit" ? (
            <Link
              href={ROUTES.profilEdit}
              className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 type-micro font-semibold text-white backdrop-blur-md"
            >
              <Icon name="photo_camera" className="text-[14px]" />
              Ganti Sampul
            </Link>
          ) : null}
        </div>

        <div className="relative px-1 pt-2 sm:px-2">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:-mt-20 lg:items-end">
            <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:gap-6">
              <div>
                <div className="h-28 w-28 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg sm:h-36 sm:w-36">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" className="h-full w-full object-cover" src={avatar} />
                </div>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-on-surface px-3 py-1 type-micro font-bold text-surface-container-lowest">
                  <Icon name="explore" className="text-[11px] text-secondary-container" />
                  {action === "edit" ? "Inisiator & Rekan Aktif" : "Traveler Komunitas"}
                </span>
              </div>
              <div className="pt-2 sm:pt-0">
                <h1 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
                  {user.displayName || "Traveler Dolan"}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                  <span className="rounded-full border border-primary/20 bg-surface-container-low px-2.5 py-0.5 type-micro font-bold text-primary">
                    {user.username ? `@${user.username}` : "Username belum diatur"}
                  </span>
                  <span className="flex items-center gap-1.5 type-caption font-medium text-on-surface-variant">
                    <Icon name="location_on" className="text-[12px] text-primary" />
                    {user.domicile || "Domisili belum diisi"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {action === "edit" ? (
                <>
                  <Link href={ROUTES.profilEdit} className="btn-primary !min-h-11">
                    <Icon name="edit" className="text-[16px]" />
                    Edit Profil
                  </Link>
                  <LogoutButton />
                </>
              ) : (
                <FollowButton />
              )}
            </div>
          </div>

          {user.bio ? (
            <p className="mt-6 max-w-4xl border-t border-outline-variant/40 pt-4 type-body-lg text-on-surface-variant">
              {user.bio}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon="hiking"
              iconClass="bg-secondary-fixed text-secondary"
              title={`${tripTotal} Trip`}
              subtitle={`${user.hostTripCount} Inisiator • ${user.participantTripCount} Peserta`}
            />
            <StatTile
              icon="groups"
              iconClass="bg-primary-fixed text-primary"
              title={`${user.followersCount + user.followingCount} Rekan`}
              subtitle={`${user.followersCount} Pengikut • ${user.followingCount} Mengikuti`}
            />
            <StatTile
              icon="star"
              iconClass="bg-secondary-fixed text-secondary"
              title={`${rating} Rating Rekan`}
              subtitle={`Dari ${user.rating.reviewCount} ulasan selesai trip`}
            />
            <StatTile
              icon="forum"
              iconClass="bg-tertiary-fixed text-tertiary"
              title="Komunikasi"
              subtitle={
                user.rating.communication != null
                  ? `${user.rating.communication.toFixed(1)} dari rekan trip`
                  : "Belum ada penilaian"
              }
            />
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 type-micro italic text-on-surface-variant">
            <Icon name="info" className="text-[12px] text-primary" />
            Statistik di atas hanya menghitung trip publik. Trip private dan draft
            tidak dipublikasikan.
          </p>
        </div>
      </section>
    </div>
  );
}

function StatTile({
  icon,
  iconClass,
  title,
  subtitle,
}: {
  icon: string;
  iconClass: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-primary/10 bg-surface-container-low p-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg ${iconClass}`}
      >
        <Icon name={icon} className="text-[22px]" />
      </div>
      <div>
        <p className="type-label font-extrabold text-on-surface">{title}</p>
        <p className="mt-0.5 type-caption text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { AuthSession } from "@/lib/contracts";
import { ROUTES } from "@/lib/routes";
import type { HomeFeedResult } from "../load-home-feed";
import styles from "./home-feed.module.css";

type HomeFeedProps = {
  session: AuthSession;
  feed: HomeFeedResult;
};

function formatRange(start: string | null, end: string | null) {
  if (!start) return "Tanggal fleksibel";
  const startLabel = new Date(start).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
  if (!end) return startLabel;
  const endLabel = new Date(end).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
  return `${startLabel} – ${endLabel}`;
}

function provinceTone(slug: string) {
  const tones = [
    "linear-gradient(145deg,#0b6e4f,#3dccc7)",
    "linear-gradient(145deg,#1d4ed8,#60a5fa)",
    "linear-gradient(145deg,#9a3412,#fb923c)",
    "linear-gradient(145deg,#6d28d9,#c4b5fd)",
    "linear-gradient(145deg,#0f766e,#5eead4)",
    "linear-gradient(145deg,#be123c,#fb7185)",
  ];
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) hash = (hash + slug.charCodeAt(i) * (i + 1)) % tones.length;
  return tones[hash] ?? tones[0];
}

export function HomeFeed({ session, feed }: HomeFeedProps) {
  const name = session.user.displayName || session.user.username || "Traveler";
  const { tasks, trips, templates, provinces } = feed.data;
  const hasTasks =
    !tasks.profileComplete ||
    tasks.draftTrips.length > 0 ||
    tasks.unreadNotifications > 0;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Beranda Dolan</p>
          <h1>
            Halo, <em>{name}</em>
          </h1>
          <p>
            {tasks.domicile
              ? `Rekomendasi dari data Dolan — trip, template, dan provinsi. Domisili profil: ${tasks.domicile}.`
              : "Temukan trip publik, template itinerary, dan jelajah 38 provinsi — tanpa boros request Places."}
          </p>
          <div className={styles.ctaRow}>
            <Link href={ROUTES.buatTrip} className={styles.ctaPrimary}>
              <Icon name="add" /> Buat trip
            </Link>
            <Link href={ROUTES.tripSaya} className={styles.ctaGhost}>
              <Icon name="luggage" /> Trip Saya
            </Link>
            <Link href={ROUTES.jelajah} className={styles.ctaGhost}>
              <Icon name="explore" /> Jelajah peta
            </Link>
          </div>
        </div>
      </section>

      {hasTasks ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <span>Perlu perhatian</span>
              <h2>Lanjutkan dari sini</h2>
            </div>
          </div>
          <div className={styles.taskGrid}>
            {!tasks.profileComplete ? (
              <Link href={ROUTES.profilEdit} className={styles.taskCard}>
                <Icon name="person" />
                <div>
                  <b>Lengkapi profil</b>
                  <p>Username, nama, dan domisili diperlukan sebelum publish/join.</p>
                </div>
              </Link>
            ) : null}
            {tasks.draftTrips.map((draft) => (
              <Link key={draft.id} href={ROUTES.trip(draft.id)} className={styles.taskCard}>
                <Icon name="edit" />
                <div>
                  <b>Lanjutkan draft</b>
                  <p>
                    {draft.title}
                    {draft.destinationCity ? ` · ${draft.destinationCity}` : ""}
                  </p>
                </div>
              </Link>
            ))}
            {tasks.unreadNotifications > 0 ? (
              <Link href={ROUTES.notifikasi} className={styles.taskCard}>
                <Icon name="notifications" />
                <div>
                  <b>{tasks.unreadNotifications} notifikasi baru</b>
                  <p>Cek join, chat, dan update trip.</p>
                </div>
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span>Siap digabung</span>
            <h2>Trip publik berangkat terdekat</h2>
            <p>Dari database Dolan — bukan hasil Places.</p>
          </div>
          <Link href={`${ROUTES.jelajah}?tab=trip`}>Lihat semua</Link>
        </div>
        {trips.length === 0 ? (
          <div className={styles.empty}>
            <b>Belum ada trip publik</b>
            <p>Jadilah yang pertama membuka slot, atau buat trip dari template.</p>
            <Link href={ROUTES.buatTrip}>Buat trip</Link>
          </div>
        ) : (
          <div className={styles.tripGrid}>
            {trips.map((trip) => (
              <article key={trip.id} className={styles.tripCard}>
                <div className={styles.tripTop}>
                  <span>Join gratis</span>
                  <small>{trip.status}</small>
                </div>
                <h3>{trip.title}</h3>
                <p>
                  <Icon name="location_on" /> {trip.destinationCity ?? "Kota menyesuaikan"}
                </p>
                <p>
                  <Icon name="calendar_month" /> {formatRange(trip.startDate, trip.endDate)}
                </p>
                <p>
                  <Icon name="group" /> {trip.participantCount} peserta
                  {trip.pendingRequestCount > 0 ? ` · ${trip.pendingRequestCount} pending` : ""}
                </p>
                <div className={styles.tripActions}>
                  <Link href={ROUTES.trip(trip.id)}>Lihat rencana</Link>
                  <Link href={`${ROUTES.trip(trip.id)}#join`}>Gabung</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={`${styles.section} ${styles.alt}`}>
        <div className={styles.sectionHead}>
          <div>
            <span>38 provinsi</span>
            <h2>Jelajah Nusantara</h2>
            <p>Kurasi lokal dari katalog Dolan — tanpa foto Places.</p>
          </div>
        </div>
        <div className={styles.provinceRail}>
          {provinces.map((province) => (
            <Link
              key={province.slug}
              href={ROUTES.province(province.slug)}
              className={styles.provinceCard}
              style={{ backgroundImage: provinceTone(province.slug) }}
            >
              <span>Provinsi</span>
              <h3>{province.name}</h3>
              <p>Ibu kota {province.capital}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span>Siap dipakai ulang</span>
            <h2>Template itinerary populer</h2>
            <p>Diurutkan dari pemakaian di Dolan (`usageCount`).</p>
          </div>
          <Link href={`${ROUTES.jelajah}?tab=template`}>Lihat template</Link>
        </div>
        {templates.length === 0 ? (
          <div className={styles.empty}>
            <b>Template masih sepi</b>
            <p>Pakai kurasi provinsi atau buat trip lalu publikasikan sebagai template.</p>
          </div>
        ) : (
          <div className={styles.templateGrid}>
            {templates.map((template) => (
              <article key={template.id} className={styles.templateCard}>
                <div className={styles.templateIcon}>
                  <Icon name="alt_route" />
                </div>
                <div>
                  <div className={styles.chips}>
                    <span>{template.sourceLabel}</span>
                    {template.popularityLabel ? <span>{template.popularityLabel}</span> : null}
                  </div>
                  <h3>{template.title}</h3>
                  <p>
                    {template.city} · {template.durationDays} hari · dipakai {template.usageCount}x
                  </p>
                  <Link href={`${ROUTES.buatTrip}?templateId=${encodeURIComponent(template.id)}`}>
                    Pakai template
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

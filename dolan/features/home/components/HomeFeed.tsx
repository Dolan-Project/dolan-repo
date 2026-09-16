"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HomeStreamItem, ItineraryTemplateSummary, PostCard } from "@dolan/shared";
import { FollowButton } from "@/components/profile/FollowButton";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { AuthSession } from "@/lib/contracts";
import { ROUTES } from "@/lib/routes";
import { findProvince, INDONESIA_PROVINCES } from "@/lib/provinces";
import { provinceCoverUrl } from "@/lib/province-cover";
import type { HomeFeedResult } from "../load-home-feed";
import type { HomeFeedPayload } from "../home-feed-types";
import styles from "./home-feed.module.css";

type HomeFeedProps = {
  session: AuthSession | null;
  feed: HomeFeedResult;
};

type RailFilter = "all" | "following" | "routes" | "gems" | "trips";
type SortTab = "popular" | "latest" | "routes" | "friends";

export function HomeFeed({ session, feed }: HomeFeedProps) {
  const router = useRouter();
  const { tasks, stream: initialStream, composer, trips, provinces } = feed.data;
  const catCardRef = useRef<HTMLDivElement>(null);
  const [catHeight, setCatHeight] = useState<number | null>(null);
  const [stream, setStream] = useState<HomeStreamItem[]>(initialStream);
  const [error, setError] = useState(feed.ok ? "" : feed.error);
  const [pending, setPending] = useState(false);
  const [caption, setCaption] = useState("");
  const [tripId, setTripId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [rail, setRail] = useState<RailFilter>("all");
  const [tab, setTab] = useState<SortTab>("popular");
  const [audience, setAudience] = useState<"public" | "community">("public");
  const [following, setFollowing] = useState<Set<string>>(() => new Set());
  const [followingReady, setFollowingReady] = useState(!session);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : ""), [photo]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!session?.user.username) {
      setFollowing(new Set());
      setFollowingReady(true);
      return;
    }
    const controller = new AbortController();
    setFollowingReady(false);
    void fetch(`/api/v1/users/${encodeURIComponent(session.user.username)}/following`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((json: { data?: { items?: Array<{ username?: string }> } }) => {
        if (controller.signal.aborted) return;
        const names = (json.data?.items ?? [])
          .map((item) => item.username)
          .filter((username): username is string => Boolean(username));
        setFollowing(new Set(names));
        setFollowingReady(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFollowing(new Set());
          setFollowingReady(true);
        }
      });
    return () => controller.abort();
  }, [session?.user.username]);

  useEffect(() => {
    const node = catCardRef.current;
    if (!node) return;
    const update = () => setCatHeight(Math.round(node.getBoundingClientRect().height));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const canPublish = tasks.profileComplete;
  const visibleStream = useMemo(() => {
    if (rail === "following" && session && !followingReady) return [];
    return filterStream(stream, rail, tab, following, session?.user.username);
  }, [following, followingReady, rail, session, stream, tab]);
  const trending = pickTrending(provinces);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!photo) {
      setError("Pilih foto dulu.");
      return;
    }
    if (audience === "community" && !tripId) {
      setError("Pilih trip dulu untuk berbagi ke komunitas.");
      return;
    }
    setPending(true);
    setError("");
    const body = new FormData();
    body.set("file", photo);
    body.set("caption", caption);
    if (tripId) body.set("tripId", tripId);
    if (templateId) body.set("templateId", templateId);
    const response = await fetch("/api/v1/posts", { method: "POST", credentials: "include", body });
    const json = (await response.json()) as { success: true; data: PostCard } | { success: false; error?: { message?: string } };
    setPending(false);
    if (!json.success) {
      setError(json.error?.message ?? "Gagal mengunggah momen.");
      return;
    }
    setCaption("");
    setTripId("");
    setTemplateId("");
    setPhoto(null);
    setStream((current) => [{ kind: "post", post: json.data }, ...current]);
    router.refresh();
  }

  async function toggleLike(post: PostCard) {
    const method = post.likedByMe ? "DELETE" : "POST";
    setStream((current) =>
      current.map((item) =>
        item.kind === "post" && item.post.id === post.id
          ? {
              ...item,
              post: {
                ...item.post,
                likedByMe: !post.likedByMe,
                likeCount: post.likeCount + (post.likedByMe ? -1 : 1),
              },
            }
          : item,
      ),
    );
    const response = await fetch(`/api/v1/posts/${post.id}/likes`, { method, credentials: "include" });
    const json = (await response.json()) as { success: true; data: PostCard } | { success: false };
    if (json.success) {
      setStream((current) =>
        current.map((item) => (item.kind === "post" && item.post.id === post.id ? { kind: "post", post: json.data } : item)),
      );
    }
  }

  async function onComment(post: PostCard, body: string) {
    const response = await fetch(`/api/v1/posts/${post.id}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = (await response.json()) as { success: true; data: PostCard["comments"][number] } | { success: false };
    if (!json.success) return false;
    setStream((current) =>
      current.map((item) =>
        item.kind === "post" && item.post.id === post.id
          ? {
              ...item,
              post: {
                ...item.post,
                commentCount: item.post.commentCount + 1,
                comments: [...item.post.comments, json.data].slice(-3),
              },
            }
          : item,
      ),
    );
    return true;
  }

  return (
    <div className={styles.page} id="momen">
      <aside className={styles.rail}>
        {session ? (
          <>
            <div className={styles.profileCard}>
              <Link href={ROUTES.profil}>
                <UserAvatar src={session.user.avatarUrl} alt="" className="mx-auto h-16 w-16 rounded-full" />
                <b>
                  {session.user.displayName}
                  {session.user.rating.reviewCount > 0 ? <Icon name="verified_user" /> : null}
                </b>
              </Link>
              <small>@{session.user.username}</small>
              {session.user.domicile ? <span className={styles.profileMeta}>{session.user.domicile}</span> : null}
            </div>
            <div className={styles.statsCard}>
              <div>
                <strong>{formatCount(session.user.hostTripCount + session.user.participantTripCount)}</strong>
                <span>Jejak</span>
              </div>
              <div>
                <strong>{formatCount(session.user.hostTripCount)}</strong>
                <span>Rute</span>
              </div>
              <div>
                <strong>{formatCount(session.user.followersCount)}</strong>
                <span>Kawan</span>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.profileCard}>
            <b>Masuk ke Dolan</b>
            <small>Ikuti jejak trip dan temukan kawan seperjalanan.</small>
            <Link href={ROUTES.masuk} className="btn-primary mt-2 !min-h-9 !px-4">
              Masuk
            </Link>
          </div>
        )}

        <div className={styles.filterCard}>
          <p className={styles.railLabel}>Aliran feed</p>
          <button type="button" className={styles.railBtn} data-active={rail === "all"} onClick={() => setRail("all")}>
            <Icon name="home" /> Semua feed
          </button>
          <button type="button" className={styles.railBtn} data-active={rail === "following"} onClick={() => setRail("following")}>
            <Icon name="groups" /> Mengikuti
          </button>
          <button type="button" className={styles.railBtn} data-active={rail === "routes"} onClick={() => setRail("routes")}>
            <Icon name="alt_route" /> Rute terverifikasi
          </button>
          <button type="button" className={styles.railBtn} data-active={rail === "gems"} onClick={() => setRail("gems")}>
            <Icon name="explore" /> Hidden gems
          </button>
          <button type="button" className={styles.railBtn} data-active={rail === "trips"} onClick={() => setRail("trips")}>
            <Icon name="luggage" /> Open trip & kawan
          </button>
        </div>

        <div className={styles.catCard} ref={catCardRef}>
          <p className={styles.railLabel}>Kategori dolan</p>
          <Link className={styles.catLink} href={`${ROUTES.jelajah}?q=${encodeURIComponent("pantai")}`}>
            <Icon name="landscape" /> Pantai & selam
          </Link>
          <Link className={styles.catLink} href={`${ROUTES.jelajah}?q=${encodeURIComponent("gunung")}`}>
            <Icon name="hiking" /> Gunung & trek
          </Link>
          <Link className={styles.catLink} href={`${ROUTES.jelajah}?q=${encodeURIComponent("roadtrip")}`}>
            <Icon name="add_road" /> Roadtrip
          </Link>
          <Link className={styles.catLink} href={ROUTES.jelajah}>
            <Icon name="map" /> Campuran
          </Link>
        </div>
      </aside>

      <div className={styles.mainCol}>
        <header className={styles.masthead}>
          <div>
            <h1>Jejak dolan</h1>
            <p>Momen liburan, rute, dan rencana trip dari traveler yang lagi jalan.</p>
          </div>
        </header>

        {error ? (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        ) : null}

        {session ? (
          <form className={styles.composer} onSubmit={(event) => void onCreate(event)}>
            <div className={styles.composerHead}>
              <div>
                <p>Jejak trip</p>
                <h2>Pamerin dolan-mu</h2>
              </div>
              <button
                type="button"
                className={styles.audience}
                data-mode={audience}
                aria-pressed={audience === "community"}
                aria-label={audience === "public" ? "Jangkauan publik. Tekan untuk komunitas." : "Jangkauan komunitas. Tekan untuk publik."}
                onClick={() => setAudience((current) => (current === "public" ? "community" : "public"))}
              >
                {audience === "public" ? "Publik" : "Komunitas"}
              </button>
            </div>
            <div className={styles.composerTop}>
              <UserAvatar src={session.user.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full" />
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Pamerin pengalaman liburanmu. Ceritain tempat, rasa, dan keseruannya."
                rows={2}
                maxLength={2200}
              />
            </div>
            <div className={styles.composerMeta}>
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                aria-label="Pilih rute"
              >
                <option value="">Pilih rute berdasarkan...</option>
                {composer.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              <select value={tripId} onChange={(event) => setTripId(event.target.value)} aria-label="Pilih trip">
                <option value="">Sambungkan trip saya...</option>
                {composer.trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title}
                  </option>
                ))}
              </select>
            </div>
            {preview ? (
              <div className={styles.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" />
                <button type="button" className={styles.previewClear} onClick={() => setPhoto(null)} aria-label="Hapus foto">
                  <Icon name="close" />
                </button>
              </div>
            ) : null}
            <div className={styles.composerActions}>
              <label className={styles.toolChip}>
                <Icon name="image" />
                Foto
                <input
                  key={photo?.name ?? "empty"}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                />
              </label>
              <button type="submit" disabled={pending || !canPublish} className={`btn-primary ${styles.publish}`}>
                {pending ? "Mengunggah…" : canPublish ? "Bagikan jejak" : "Lengkapi profil"}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.composer}>
            <div className={styles.composerHead}>
              <div>
                <p>Komunitas</p>
                <h2>Masuk dulu, baru cerita dolan</h2>
              </div>
            </div>
            <p className={styles.guestHint}>Lihat jejak trip teman seperjalanan dan bagikan momen liburanmu di beranda.</p>
            <div className={styles.composerActions}>
              <Link href={ROUTES.masuk} className={`btn-primary ${styles.publish}`}>
                Masuk
              </Link>
            </div>
          </div>
        )}

        <div className={styles.tabs} role="tablist" aria-label="Urutan jejak">
          <button type="button" className={styles.tab} data-active={tab === "popular"} onClick={() => setTab("popular")}>
            Populer minggu ini
          </button>
          <button type="button" className={styles.tab} data-active={tab === "latest"} onClick={() => setTab("latest")}>
            Terbaru
          </button>
          <button type="button" className={styles.tab} data-active={tab === "routes"} onClick={() => setTab("routes")}>
            Punya rute lengkap
          </button>
          <button type="button" className={styles.tab} data-active={tab === "friends"} onClick={() => setTab("friends")}>
            Cari teman trip
          </button>
        </div>

        <div className={styles.stream}>
          {rail === "trips" || tab === "friends" ? (
            trips.length === 0 ? (
              <EmptyState copy={emptyCopy(rail, tab, followingReady, Boolean(session))} />
            ) : (
              trips.map((trip) => <OpenTripCard key={trip.id} trip={trip} />)
            )
          ) : visibleStream.length === 0 ? (
            <EmptyState copy={emptyCopy(rail, tab, followingReady, Boolean(session))} />
          ) : (
            visibleStream.map((item) =>
              item.kind === "plan" ? (
                <PlanCard key={`plan-${item.template.id}`} template={item.template} />
              ) : (
                <MomentCard
                  key={item.post.id}
                  post={item.post}
                  showFollow={Boolean(session && session.user.username !== item.post.author.username)}
                  onLike={() => void toggleLike(item.post)}
                  onComment={(body) => onComment(item.post, body)}
                />
              ),
            )
          )}
        </div>
      </div>

      <aside className={styles.rail}>
        <div className={styles.trendCard}>
          <h3>Destinasi trending</h3>
          <div className={styles.trendList}>
            {trending.map((province, index) => (
              <Link key={province.id} className={styles.trendRow} href={ROUTES.province(province.slug)}>
                <span className={styles.rank}>{index + 1}</span>
                <span>
                  <b>{province.name}</b>
                  <small>{province.capital}</small>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <PopularProvinces provinces={provinces} height={catHeight} />
      </aside>

      <p className={styles.pageFoot}>Jejak dolan. Ruang temu, penjelajah rute, dan cerita nusantara.</p>
    </div>
  );
}

type ProvinceSlide = {
  slug: string;
  name: string;
  capital: string;
  cover: string;
};

function popularProvinceSlides(feedProvinces: HomeFeedPayload["provinces"]): ProvinceSlide[] {
  const fromFeed = feedProvinces
    .map((province) => {
      const catalog = findProvince(province.slug);
      if (!catalog) return null;
      return {
        slug: catalog.slug,
        name: catalog.name,
        capital: catalog.capital,
        cover: provinceCoverUrl(catalog),
      };
    })
    .filter((row): row is ProvinceSlide => Boolean(row));
  if (fromFeed.length >= 10) return fromFeed;
  return INDONESIA_PROVINCES.map((province) => ({
    slug: province.slug,
    name: province.name,
    capital: province.capital,
    cover: provinceCoverUrl(province),
  }));
}

const POPULAR_PAGE = 5;

function popularPage(slides: ProvinceSlide[], start: number) {
  return Array.from({ length: POPULAR_PAGE }, (_, offset) => slides[(start + offset) % slides.length]!);
}

function PopularProvinces({
  provinces,
  height,
}: {
  provinces: HomeFeedPayload["provinces"];
  height: number | null;
}) {
  const slides = useMemo(() => popularProvinceSlides(provinces), [provinces]);
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [sliding, setSliding] = useState(false);
  const pausedRef = useRef(false);
  const slidingRef = useRef(false);
  slidingRef.current = sliding;

  const current = count > 0 ? popularPage(slides, index) : [];
  const upcoming = count > 0 ? popularPage(slides, index + POPULAR_PAGE) : [];

  useEffect(() => {
    upcoming.forEach((province) => {
      const image = new window.Image();
      image.src = province.cover;
    });
  }, [upcoming]);

  useEffect(() => {
    if (count < POPULAR_PAGE) return;
    const timer = window.setInterval(() => {
      if (pausedRef.current || slidingRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setIndex((value) => (value + POPULAR_PAGE) % count);
        return;
      }
      setSliding(true);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  return (
    <section
      className={styles.popularStack}
      style={height ? { height } : undefined}
      aria-label="Provinsi populer di Dolan"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <p className={styles.railLabel}>Populer di Dolan</p>
      <div className={styles.popularViewport}>
        <div
          className={styles.popularTrack}
          data-sliding={sliding}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget || !sliding) return;
            setIndex((value) => (value + POPULAR_PAGE) % count);
            setSliding(false);
          }}
        >
          <div className={styles.popularPair}>
            {current.map((province) => (
              <ProvincePromoCard key={`now-${province.slug}`} province={province} />
            ))}
          </div>
          <div className={styles.popularPair}>
            {upcoming.map((province) => (
              <ProvincePromoCard key={`next-${province.slug}`} province={province} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProvincePromoCard({ province }: { province: ProvinceSlide }) {
  return (
    <Link href={ROUTES.province(province.slug)} className={styles.provincePromo}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={province.cover} alt="" />
      <span className={styles.provincePromoCopy}>
        <b>{province.name}</b>
        <small>{province.capital}</small>
      </span>
    </Link>
  );
}

function pickTrending(provinces: HomeFeedPayload["provinces"]) {
  const preferred = ["nusa-tenggara-timur", "jawa-tengah", "jawa-timur", "bali"];
  const ranked = preferred
    .map((slug) => provinces.find((province) => province.slug === slug))
    .filter((province): province is HomeFeedPayload["provinces"][number] => Boolean(province));
  const rest = provinces.filter((province) => !preferred.includes(province.slug));
  return [...ranked, ...rest].slice(0, 4);
}

function EmptyState({ copy }: { copy: { title: string; body: string } }) {
  return (
    <div className={styles.empty}>
      <Icon name="luggage" />
      <b>{copy.title}</b>
      <p>{copy.body}</p>
    </div>
  );
}

function emptyCopy(rail: RailFilter, tab: SortTab, followingReady: boolean, signedIn: boolean) {
  if (rail === "trips" || tab === "friends") {
    return { title: "Belum ada open trip", body: "Trip yang bisa diikuti akan muncul di sini." };
  }
  if (rail === "following") {
    if (!signedIn) {
      return { title: "Masuk dulu", body: "Ikuti traveler lain, lalu jejak mereka muncul di aliran ini." };
    }
    if (!followingReady) {
      return { title: "Memuat jejak", body: "Mengambil akun yang kamu ikuti." };
    }
    return { title: "Belum ada jejak dari yang kamu ikuti", body: "Ikuti kawan dolan supaya momen mereka masuk ke sini." };
  }
  if (rail === "routes" || tab === "routes") {
    return { title: "Belum ada rute terverifikasi", body: "Rute kurasi Dolan akan tampil di aliran ini." };
  }
  if (rail === "gems") {
    return { title: "Belum ada hidden gems", body: "Rute traveler yang jarang dipakai akan tampil di sini." };
  }
  return { title: "Belum ada jejak", body: "Pasang foto liburan atau jelajah rute di kolom ini." };
}

function templateOf(item: HomeStreamItem) {
  return item.kind === "plan" ? item.template : item.post.template;
}

function isVerifiedRoute(item: HomeStreamItem) {
  return templateOf(item)?.source === "CURATED";
}

function isHiddenGem(item: HomeStreamItem) {
  const template = templateOf(item);
  if (!template) return false;
  return template.source === "USER_TRIP" || template.usageCount < 8;
}

function popularityScore(item: HomeStreamItem) {
  if (item.kind === "post") {
    return item.post.likeCount * 3 + item.post.commentCount * 2 + (item.post.template?.usageCount ?? 0);
  }
  return item.template.usageCount * 4 + (item.template.popularityLabel ? 12 : 0) + (item.template.source === "CURATED" ? 8 : 0);
}

function filterStream(
  stream: HomeStreamItem[],
  rail: RailFilter,
  tab: SortTab,
  following: Set<string>,
  me: string | undefined,
): HomeStreamItem[] {
  let next = stream;
  if (rail === "following") {
    next = next.filter((item) => {
      if (item.kind !== "post") return false;
      const username = item.post.author.username;
      return username === me || following.has(username);
    });
  } else if (rail === "routes") {
    next = next.filter(isVerifiedRoute);
  } else if (rail === "gems") {
    const gems = next.filter(isHiddenGem);
    next = gems.length > 0 ? gems : next.filter((item) => Boolean(templateOf(item)));
  }

  if (tab === "routes" && rail !== "routes") {
    next = next.filter((item) => item.kind === "plan" || Boolean(item.kind === "post" && item.post.template));
  }

  if (tab === "latest") {
    next = [...next].sort((a, b) => {
      const left = a.kind === "post" ? a.post.createdAt : "";
      const right = b.kind === "post" ? b.post.createdAt : "";
      if (left && right) return right.localeCompare(left);
      if (left) return -1;
      if (right) return 1;
      return 0;
    });
  } else if (tab === "popular") {
    next = [...next].sort((a, b) => popularityScore(b) - popularityScore(a));
  }
  return next;
}

function formatCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

function PlanCard({ template }: { template: ItineraryTemplateSummary }) {
  const href = `${ROUTES.buatTrip}?templateId=${encodeURIComponent(template.id)}`;
  const cover = template.coverPlace?.photoUri;
  return (
    <article className={styles.plan}>
      <div className={styles.planCover} style={cover ? { backgroundImage: `url(${cover})` } : undefined} />
      <div className={styles.planBody}>
        <p>Rencana siap pakai</p>
        <h3>{template.title}</h3>
        <span>
          {template.city}, {template.durationDays} hari, dipakai {template.usageCount}x
        </span>
        <Link className={styles.routeCta} href={href}>
          <Icon name="alt_route" />
          Pakai rute ini
        </Link>
      </div>
    </article>
  );
}

function OpenTripCard({ trip }: { trip: HomeFeedPayload["trips"][number] }) {
  return (
    <article className={styles.tripCard}>
      <div className={styles.tripCover} />
      <div className={styles.tripBody}>
        <p>Open trip</p>
        <h3>{trip.title}</h3>
        <span>
          {[trip.destinationCity, trip.publicMeetingPointLabel].filter(Boolean).join(", ")}
        </span>
        <Link className={styles.routeCta} href={ROUTES.trip(trip.id)}>
          <Icon name="group" />
          Lihat trip
        </Link>
      </div>
    </article>
  );
}

function formatStampDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function postTitle(post: PostCard) {
  const firstLine = post.caption.split("\n").map((line) => line.trim()).find(Boolean);
  if (firstLine && firstLine.length <= 90) return firstLine;
  return post.trip?.title || post.template?.title || firstLine?.slice(0, 80) || `Jejak ${post.author.displayName}`;
}

function MomentCard({
  post,
  showFollow,
  onLike,
  onComment,
}: {
  post: PostCard;
  showFollow: boolean;
  onLike: () => void;
  onComment: (body: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const stamp = post.trip?.title || post.template?.city || post.template?.title || "";
  const title = postTitle(post);
  const body = post.caption.trim() === title ? "" : post.caption;

  useEffect(() => {
    if (commentOpen) commentInputRef.current?.focus();
  }, [commentOpen]);

  return (
    <article className={styles.post} id={`post-${post.id}`}>
      <header className={styles.postHead}>
        <Link href={ROUTES.profilUser(post.author.username)} className={styles.author}>
          <UserAvatar src={post.author.avatarUrl} alt="" className="h-9 w-9 rounded-full" />
          <div>
            <b>{post.author.displayName}</b>
            <small>
              @{post.author.username}
              {post.author.domicile ? ` · ${post.author.domicile}` : ` · ${formatStampDate(post.createdAt)}`}
            </small>
          </div>
        </Link>
        {showFollow ? <FollowButton username={post.author.username} compact /> : null}
      </header>
      <div className={styles.photoWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.postPhoto} src={post.imageUrl} alt={post.caption || `Jejak ${post.author.displayName}`} />
        {stamp ? (
          <span className={styles.stamp}>
            <Icon name="location_on" />
            {stamp}
          </span>
        ) : null}
      </div>
      <div className={styles.postCopy}>
        <h3>{title}</h3>
        {body ? <p className={styles.caption}>{body}</p> : null}
      </div>
      {post.template ? (
        <div className={styles.routeBox}>
          <span>
            Rute: {post.template.title}
          </span>
          <Link className={styles.routeCta} href={`${ROUTES.buatTrip}?templateId=${encodeURIComponent(post.template.id)}`}>
            Rute GPX
            <Icon name="arrow_forward" />
          </Link>
        </div>
      ) : post.trip ? (
        <div className={styles.routeBox}>
          <span>{post.trip.title}</span>
          <Link className={styles.routeCta} href={ROUTES.trip(post.trip.id)}>
            Lihat trip
            <Icon name="arrow_forward" />
          </Link>
        </div>
      ) : null}
      <div className={styles.postActions}>
        <button type="button" onClick={onLike} aria-pressed={post.likedByMe} className={styles.like}>
          <Icon name="favorite" filled={post.likedByMe} />
          <span>{post.likeCount}</span>
        </button>
        <button
          type="button"
          className={styles.like}
          aria-expanded={commentOpen}
          aria-controls={`comment-${post.id}`}
          onClick={() => setCommentOpen((open) => !open)}
        >
          <Icon name="chat_bubble" filled={commentOpen} />
          <span>{post.commentCount}</span>
        </button>
        <button
          type="button"
          className={styles.like}
          aria-label={copied ? "Tautan tersalin" : "Salin tautan jejak"}
          onClick={() => {
            const url = `${window.location.origin}/#post-${post.id}`;
            void navigator.clipboard?.writeText(url)?.then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          <Icon name="share" />
          {copied ? <span className={styles.copied}>Tersalin</span> : null}
        </button>
      </div>
      {post.comments.length > 0 ? (
        <ul className={styles.comments}>
          {post.comments.map((comment) => (
            <li key={comment.id}>
              <b>{comment.author.displayName}</b> {comment.body}
            </li>
          ))}
        </ul>
      ) : null}
      {commentOpen ? (
        <form
          id={`comment-${post.id}`}
          className={styles.commentForm}
          onSubmit={(event) => {
            event.preventDefault();
            const next = draft.trim();
            if (!next) return;
            void onComment(next).then((ok) => {
              if (ok) setDraft("");
            });
          }}
        >
          <input
            ref={commentInputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tulis cerita di jejak ini…"
            maxLength={2000}
          />
          <button type="submit">Kirim</button>
        </form>
      ) : null}
    </article>
  );
}

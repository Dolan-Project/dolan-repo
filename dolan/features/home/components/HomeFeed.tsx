"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { HomeStreamItem, ItineraryTemplateSummary, PostCard } from "@dolan/shared";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { AuthSession } from "@/lib/contracts";
import { ROUTES } from "@/lib/routes";
import type { HomeFeedResult } from "../load-home-feed";
import styles from "./home-feed.module.css";

type HomeFeedProps = {
  session: AuthSession | null;
  feed: HomeFeedResult;
};

export function HomeFeed({ session, feed }: HomeFeedProps) {
  const router = useRouter();
  const { tasks, stream: initialStream, composer } = feed.data;
  const [stream, setStream] = useState<HomeStreamItem[]>(initialStream);
  const [error, setError] = useState(feed.ok ? "" : feed.error);
  const [pending, setPending] = useState(false);
  const [caption, setCaption] = useState("");
  const [tripId, setTripId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : ""), [photo]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const canPublish = tasks.profileComplete;

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!photo) {
      setError("Pilih foto dulu.");
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
      {error ? (
        <p className={styles.alert} role="alert">
          {error}
        </p>
      ) : null}

      {session ? (
      <form className={styles.composer} onSubmit={(event) => void onCreate(event)}>
        <div className={styles.composerTop}>
          <UserAvatar src={session.user.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full" />
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Apa yang sedang kamu dolan?"
            rows={2}
            maxLength={2200}
          />
        </div>
        <div className={styles.composerMeta}>
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            <option value="">Template</option>
            {composer.templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
          <select value={tripId} onChange={(event) => setTripId(event.target.value)}>
            <option value="">Trip</option>
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
            <button
              type="button"
              className={styles.previewClear}
              onClick={() => setPhoto(null)}
              aria-label="Hapus foto"
            >
              <Icon name="close" />
            </button>
          </div>
        ) : null}
        <div className={styles.composerActions}>
          <label className={styles.cameraBtn} aria-label="Pilih foto">
            <Icon name="photo_camera" />
            <input
              key={photo?.name ?? "empty"}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
          </label>
          <button type="submit" disabled={pending || !canPublish} className={styles.publish}>
            {pending ? "Mengunggah…" : canPublish ? "Unggah" : "Lengkapi profil"}
          </button>
        </div>
      </form>
      ) : (
        <div className={styles.composer}>
          <p className={styles.guestHint}>Masuk untuk bagikan momen dan melihat rencana di beranda.</p>
          <Link href={ROUTES.masuk} className={styles.publish}>
            Masuk
          </Link>
        </div>
      )}

      <div className={styles.stream}>
        {stream.length === 0 ? (
          <div className={styles.empty}>
            <b>Belum ada momen</b>
            <p>Unggah foto liburan pertamamu di form di atas.</p>
          </div>
        ) : (
          stream.map((item) =>
            item.kind === "plan" ? (
              <PlanCard key={`plan-${item.template.id}`} template={item.template} />
            ) : (
              <MomentCard
                key={item.post.id}
                post={item.post}
                onLike={() => void toggleLike(item.post)}
                onComment={(body) => onComment(item.post, body)}
              />
            ),
          )
        )}
      </div>
    </div>
  );
}

function PlanCard({ template }: { template: ItineraryTemplateSummary }) {
  const href = `${ROUTES.buatTrip}?templateId=${encodeURIComponent(template.id)}`;
  const cover = template.coverPlace?.photoUri;
  return (
    <article className={styles.plan}>
      <div className={styles.planCover} style={cover ? { backgroundImage: `url(${cover})` } : undefined} />
      <div className={styles.planBody}>
        <p>Rencana yang sering dipakai</p>
        <h3>{template.title}</h3>
        <span>
          {template.city} · {template.durationDays} hari · dipakai {template.usageCount}x
        </span>
        <Link href={href}>Pakai template</Link>
      </div>
    </article>
  );
}

function MomentCard({
  post,
  onLike,
  onComment,
}: {
  post: PostCard;
  onLike: () => void;
  onComment: (body: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");
  return (
    <article className={styles.post} id={`post-${post.id}`}>
      <header className={styles.postHead}>
        <Link href={ROUTES.profilUser(post.author.username)} className={styles.author}>
          <UserAvatar src={post.author.avatarUrl} alt="" className="h-9 w-9 rounded-full" />
          <div>
            <b>{post.author.displayName}</b>
            <small>@{post.author.username}</small>
          </div>
        </Link>
      </header>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.postPhoto} src={post.imageUrl} alt={post.caption || `Momen ${post.author.displayName}`} />
      <div className={styles.postActions}>
        <button type="button" onClick={onLike} aria-pressed={post.likedByMe} className={styles.like}>
          <Icon name="favorite" filled={post.likedByMe} />
          <span>{post.likeCount}</span>
        </button>
        <span className={styles.like}>
          <Icon name="chat_bubble" />
          {post.commentCount}
        </span>
      </div>
      {post.caption ? (
        <p className={styles.caption}>
          <b>{post.author.username}</b> {post.caption}
        </p>
      ) : null}
      {post.template ? (
        <Link
          className={styles.routeCta}
          href={`${ROUTES.buatTrip}?templateId=${encodeURIComponent(post.template.id)}`}
        >
          Pakai rute yang sama · {post.template.title}
        </Link>
      ) : post.trip ? (
        <Link className={styles.routeCta} href={ROUTES.trip(post.trip.id)}>
          Lihat perjalanan ini · {post.trip.title}
        </Link>
      ) : null}
      <ul className={styles.comments}>
        {post.comments.map((comment) => (
          <li key={comment.id}>
            <b>{comment.author.username}</b> {comment.body}
          </li>
        ))}
      </ul>
      <form
        className={styles.commentForm}
        onSubmit={(event) => {
          event.preventDefault();
          const body = draft.trim();
          if (!body) return;
          void onComment(body).then((ok) => {
            if (ok) setDraft("");
          });
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Tulis komentar…"
          maxLength={2000}
        />
        <button type="submit">Kirim</button>
      </form>
    </article>
  );
}

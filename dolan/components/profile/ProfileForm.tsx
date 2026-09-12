"use client";

import {
  API_V1_PREFIX,
  EXPRESS_PATHS,
  resolvePostAuthPath,
  type ApiError,
  type AuthSession,
  type PublicUser,
} from "@/lib/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/auth/Field";
import { Icon } from "@/components/ui/Icon";

const DOMICILES = [
  "Kota Bandung, Jawa Barat",
  "Jakarta Selatan, DKI Jakarta",
  "Kota Surabaya, Jawa Timur",
  "Kota Denpasar, Bali",
  "Kab. Sleman, D.I. Yogyakarta",
];

type ProfileFormProps = {
  user: PublicUser;
  next?: string;
};

export function ProfileForm({ user, next }: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [domicile, setDomicile] = useState(user.domicile ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [coverCaption, setCoverCaption] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(user.coverUrl);

  async function upload(kind: "avatar" | "cover", file: File) {
    setUploadError("");
    const form = new FormData();
    form.append("file", file);
    const path =
      kind === "avatar"
        ? `${API_V1_PREFIX}${EXPRESS_PATHS.usersMeAvatar}`
        : `${API_V1_PREFIX}${EXPRESS_PATHS.usersMeCover}`;
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const json = (await response.json()) as
      | { success: true; data: { avatarUrl?: string; coverUrl?: string } }
      | ApiError;
    if (!json.success) {
      setUploadError(json.error.message);
      return;
    }
    if (json.data.avatarUrl) setAvatarUrl(json.data.avatarUrl);
    if (json.data.coverUrl) setCoverUrl(json.data.coverUrl);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError("");
    setFieldErrors({});
    const response = await fetch(`${API_V1_PREFIX}${EXPRESS_PATHS.usersMe}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username,
        displayName,
        domicile,
        bio,
        coverCaption,
      }),
    });
    const json = (await response.json()) as
      | { success: true; data: AuthSession }
      | ApiError;
    setPending(false);
    if (!json.success) {
      setFormError(json.error.message);
      setFieldErrors(json.error.fields ?? {});
      return;
    }
    router.push(resolvePostAuthPath(next));
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="relative block h-36 cursor-pointer overflow-hidden rounded-2xl bg-surface-container-highest">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="h-full w-full object-cover" src={coverUrl} />
        ) : (
          <span className="flex h-full items-center justify-center type-caption text-on-surface-variant">
            Unggah foto cover
          </span>
        )}
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload("cover", file);
          }}
        />
      </label>

      <div className="flex items-center gap-4 rounded-2xl bg-surface-container-low p-3">
        <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-surface-container-highest text-primary">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={avatarUrl} />
          ) : (
            <Icon name="person" className="text-[32px]" />
          )}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload("avatar", file);
            }}
          />
        </label>
        <div>
          <p className="type-label text-on-surface">Foto Profil (Opsional)</p>
          <p className="type-caption text-on-surface-variant">
            JPG, PNG atau WebP maks 2MB. Boleh gunakan foto ransel/lanskap kamu.
          </p>
        </div>
      </div>
      {uploadError ? (
        <p className="type-body text-error" role="alert">
          {uploadError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field id="displayName" label="Nama Tampilan" error={fieldErrors.displayName}>
          <input
            id="displayName"
            className="field-input"
            required
            value={displayName}
            aria-invalid={Boolean(fieldErrors.displayName)}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </Field>
        <Field id="username" label="Username Unik" error={fieldErrors.username}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 type-label text-on-surface-variant">
              @
            </span>
            <input
              id="username"
              className="field-input pl-8"
              required
              value={username}
              aria-invalid={Boolean(fieldErrors.username)}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
        </Field>
      </div>
      <Field
        id="domicile"
        label="Domisili Kota / Kabupaten"
        error={fieldErrors.domicile}
        hint="Digunakan untuk merekomendasikan titik kumpul terdekat."
      >
        <div className="relative">
          <Icon
            name="location_on"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
          />
          <select
            id="domicile"
            className="field-input field-input-icon appearance-none pr-11"
            required
            value={domicile}
            aria-invalid={Boolean(fieldErrors.domicile)}
            onChange={(event) => setDomicile(event.target.value)}
          >
            <option value="">Pilih domisili</option>
            {DOMICILES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
            {domicile && !DOMICILES.includes(domicile) ? (
              <option value={domicile}>{domicile}</option>
            ) : null}
          </select>
        </div>
      </Field>
      <Field
        id="bio"
        label="Bio Singkat Traveler"
        error={fieldErrors.bio}
        labelExtra={
          <span className="type-micro text-on-surface-variant">{bio.length}/160</span>
        }
      >
        <textarea
          id="bio"
          className="field-input min-h-24 py-3"
          maxLength={160}
          rows={3}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
      </Field>
      <Field id="coverCaption" label="Caption cover (opsional)" error={fieldErrors.coverCaption}>
        <input
          id="coverCaption"
          className="field-input"
          maxLength={160}
          value={coverCaption}
          onChange={(event) => setCoverCaption(event.target.value)}
        />
      </Field>
      <div className="flex items-center gap-3 rounded-xl bg-surface-container p-3 type-caption text-on-surface-variant">
        <Icon name="verified_user" className="shrink-0 text-[20px] text-primary" />
        <span>
          DOLAN tidak pernah meminta foto KTP, sidik jari, atau rekening bank
          untuk mendaftar akun penjelajah.
        </span>
      </div>
      {formError ? (
        <p className="type-body text-error" role="alert">
          {formError}
        </p>
      ) : null}
      <button className="btn-brand w-full !min-h-12" disabled={pending} type="submit">
        {pending ? "Memproses…" : "Simpan & Mulai Dolan"}
      </button>
    </form>
  );
}

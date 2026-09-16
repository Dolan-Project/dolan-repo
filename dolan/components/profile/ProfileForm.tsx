"use client";

import {
  API_V1_PREFIX,
  EXPRESS_PATHS,
  resolvePostAuthPath,
  socialHandleFromUrl,
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
  const [instagram, setInstagram] = useState(socialHandleFromUrl(user.instagramUrl));
  const [tiktok, setTiktok] = useState(socialHandleFromUrl(user.tiktokUrl));
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
        instagramUrl: instagram,
        tiktokUrl: tiktok,
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          id="instagram"
          label="Instagram"
          error={fieldErrors.instagramUrl}
          hint="Opsional. Username atau tautan profil."
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 type-label text-on-surface-variant">
              @
            </span>
            <input
              id="instagram"
              className="field-input pl-8"
              value={instagram}
              placeholder="username"
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.instagramUrl)}
              onChange={(event) => setInstagram(event.target.value)}
            />
          </div>
        </Field>
        <Field
          id="tiktok"
          label="TikTok"
          error={fieldErrors.tiktokUrl}
          hint="Opsional. Username atau tautan profil."
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 type-label text-on-surface-variant">
              @
            </span>
            <input
              id="tiktok"
              className="field-input pl-8"
              value={tiktok}
              placeholder="username"
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.tiktokUrl)}
              onChange={(event) => setTiktok(event.target.value)}
            />
          </div>
        </Field>
      </div>
      <p className="type-caption text-on-surface-variant">
        Traveler lain bisa membuka Instagram atau TikTok-mu untuk menilai apakah
        akunmu terlihat asli.
      </p>
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

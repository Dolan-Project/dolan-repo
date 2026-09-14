"use client";

import {
  AUTH_PATHS,
  type ApiError,
  type AuthSession,
} from "@/lib/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Field } from "@/components/auth/Field";
import { authStyles as styles } from "@/components/auth/AuthShell";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

type RegisterFormProps = {
  next?: string;
};

function passwordScore(value: string): number {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

export function RegisterForm({ next }: RegisterFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const score = useMemo(() => passwordScore(password), [password]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!agreed) {
      setFormError("Centang syarat & ketentuan untuk lanjut.");
      return;
    }
    setPending(true);
    setFormError("");
    setFieldErrors({});
    const response = await fetch(AUTH_PATHS.register, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, confirmPassword, displayName, username, next }),
    });
    const json = (await response.json()) as
      | { success: true; data: AuthSession & { debugVerifyToken?: string } }
      | ApiError;
    setPending(false);
    if (!json.success) {
      setFormError(json.error.message);
      setFieldErrors(json.error.fields ?? {});
      return;
    }
    const params = new URLSearchParams({ email });
    if (next) params.set("next", next);
    if (json.data.debugVerifyToken) params.set("debugToken", json.data.debugVerifyToken);
    router.push(`${ROUTES.cekEmail}?${params.toString()}`);
    router.refresh();
  }

  const googleHref = next
    ? `${AUTH_PATHS.google}?next=${encodeURIComponent(next)}`
    : AUTH_PATHS.google;

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <a className={styles.googleBtn} href={googleHref}>
        <GoogleMark />
        Daftar dengan Google
      </a>

      <div className={styles.divider}>
        <span>atau isi manual</span>
      </div>

      <Field id="email" label="Email aktif" error={fieldErrors.email} hint="Pakai email yang bisa kamu buka.">
        <div className="relative">
          <Icon
            name="mail"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field-input field-input-icon"
            placeholder="rani.explorer@gmail.com"
            value={email}
            aria-invalid={Boolean(fieldErrors.email)}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="displayName" label="Nama tampilan" error={fieldErrors.displayName}>
          <input
            id="displayName"
            name="displayName"
            className="field-input"
            placeholder="Rani Explorer"
            value={displayName}
            aria-invalid={Boolean(fieldErrors.displayName)}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </Field>
        <Field
          id="username"
          label="Username"
          error={fieldErrors.username}
          hint="Bisa dilengkapi nanti di profil."
        >
          <input
            id="username"
            name="username"
            className="field-input"
            placeholder="rani.explorer"
            value={username}
            aria-invalid={Boolean(fieldErrors.username)}
            onChange={(event) => setUsername(event.target.value)}
          />
        </Field>
      </div>

      <Field id="password" label="Kata sandi baru" error={fieldErrors.password}>
        <div className="relative">
          <Icon
            name="lock"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            className="field-input field-input-icon pr-11"
            value={password}
            aria-invalid={Boolean(fieldErrors.password)}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
            onClick={() => setShowPassword((value) => !value)}
          >
            <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[20px]" />
          </button>
        </div>
        {password ? (
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between type-micro">
              <span className="text-on-surface-variant">Kekuatan kata sandi</span>
              <span className="font-bold text-tertiary">
                {score >= 3 ? "Kuat" : score === 2 ? "Cukup" : "Lemah"}
              </span>
            </div>
            <div className="grid h-1.5 grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`rounded-full ${index < score ? "bg-tertiary" : "bg-surface-container-highest"}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="type-caption text-on-surface-variant">Minimal 8 karakter.</p>
        )}
      </Field>

      <Field id="confirmPassword" label="Ulangi kata sandi" error={fieldErrors.confirmPassword}>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="field-input"
          value={confirmPassword}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </Field>

      <label className="flex items-start gap-2.5 rounded-xl bg-surface-container-low/80 p-3.5 ring-1 ring-outline-variant/40">
        <input
          checked={agreed}
          className="mt-0.5 h-4 w-4 accent-primary"
          type="checkbox"
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <span className="type-caption text-on-surface-variant">
          Saya menyetujui syarat & ketentuan, menghormati sesama penjelajah, dan mematuhi etika
          keselamatan open-trip.
        </span>
      </label>

      {formError ? (
        <p className={styles.alert} role="alert">
          {formError}{" "}
          {formError.includes("terdaftar") ? (
            <Link href={ROUTES.masuk} className="font-bold text-primary">
              Masuk
            </Link>
          ) : null}
        </p>
      ) : null}

      <button className="btn-primary w-full !min-h-12" disabled={pending} type="submit">
        {pending ? "Memproses…" : "Buat akun Dolan"}
        {!pending ? <Icon name="arrow_forward" className="text-[18px]" /> : null}
      </button>

      <p className={styles.footerNote}>
        Sudah punya akun? <Link href={ROUTES.masuk}>Masuk</Link>
      </p>
    </form>
  );
}

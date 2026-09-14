"use client";

import {
  AUTH_PATHS,
  type AuthSession,
  type ApiError,
} from "@/lib/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/auth/Field";
import { authStyles as styles } from "@/components/auth/AuthShell";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { Icon } from "@/components/ui/Icon";
import { resolveAfterAuth } from "@/lib/auth/post-auth-path";
import { ROUTES } from "@/lib/routes";

type LoginFormProps = {
  next?: string;
  initialError?: string;
};

export function LoginForm({ next, initialError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState(initialError ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError("");
    setFieldErrors({});
    const response = await fetch(AUTH_PATHS.login, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, next }),
    });
    const json = (await response.json()) as
      | { success: true; data: AuthSession }
      | ApiError;
    setPending(false);
    if (!json.success) {
      const code = json.error.code;
      const friendly =
        code === "INVALID_CREDENTIALS"
          ? "Email atau kata sandi belum cocok. Periksa lagi, atau gunakan Lupa Password."
          : code === "INVALID_TOKEN" || /invalid or expired session/i.test(json.error.message)
            ? "Sesi sebelumnya sudah tidak berlaku. Masuk lagi dengan email dan kata sandi kamu."
            : json.error.message;
      setFormError(friendly);
      setFieldErrors(json.error.fields ?? {});
      return;
    }
    void remember;
    router.push(resolveAfterAuth(json.data, next));
    router.refresh();
  }

  const googleHref = next
    ? `${AUTH_PATHS.google}?next=${encodeURIComponent(next)}`
    : AUTH_PATHS.google;

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {next ? (
        <p className={styles.notice}>
          <Icon name="lock" className="mt-0.5 shrink-0 text-[20px]" />
          <span>
            <strong>Masuk untuk melanjutkan rencana kamu.</strong> Draf destinasi
            dan isianmu tetap aman.
          </span>
        </p>
      ) : null}

      <a className={styles.googleBtn} href={googleHref}>
        <GoogleMark />
        Lanjut dengan Google
      </a>

      <div className={styles.divider}>
        <span>atau pakai email</span>
      </div>

      <Field id="email" label="Alamat Email" error={fieldErrors.email}>
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
            placeholder="nama@email.com"
            value={email}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </Field>

      <Field
        id="password"
        label="Kata Sandi"
        error={fieldErrors.password}
        labelExtra={
          <Link href={ROUTES.lupaPassword} className="type-micro text-primary hover:underline">
            Lupa Password?
          </Link>
        }
      >
        <div className="relative">
          <Icon
            name="lock"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
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
      </Field>

      <label className="flex cursor-pointer items-center gap-2 pt-0.5">
        <input
          checked={remember}
          className="h-4 w-4 accent-primary"
          type="checkbox"
          onChange={(event) => setRemember(event.target.checked)}
        />
        <span className="type-caption text-on-surface-variant">Ingat saya di perangkat ini</span>
      </label>

      {formError ? (
        <p className={styles.alert} role="alert">
          {formError}
        </p>
      ) : null}

      <button className="btn-primary mt-1 w-full !min-h-12" disabled={pending} type="submit">
        {pending ? "Memproses…" : "Masuk ke Dolan"}
        {!pending ? <Icon name="arrow_forward" className="text-[18px]" /> : null}
      </button>

      <p className={styles.footerNote}>
        Belum punya akun?{" "}
        <Link
          href={next ? `${ROUTES.daftar}?next=${encodeURIComponent(next)}` : ROUTES.daftar}
        >
          Daftar gratis
        </Link>
      </p>
    </form>
  );
}

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
import { Icon } from "@/components/ui/Icon";
import { resolveAfterAuth } from "@/lib/auth/post-auth-path";
import { ROUTES } from "@/lib/routes";

type LoginFormProps = {
  next?: string;
};

export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
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
      setFormError(json.error.message);
      setFieldErrors(json.error.fields ?? {});
      return;
    }
    void remember;
    router.push(resolveAfterAuth(json.data, next));
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {next ? (
        <p className="flex items-start gap-2.5 rounded-xl bg-surface-container-low p-3.5 type-body text-on-surface">
          <Icon name="lock" className="mt-0.5 text-[20px] text-primary" />
          <span>
            <strong>Masuk untuk melanjutkan rencana kamu</strong> — Draf
            destinasi dan data input tersimpan aman dan tidak akan hilang.
          </span>
        </p>
      ) : null}
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
          <Link
            href={ROUTES.lupaPassword}
            className="type-micro text-primary hover:underline"
          >
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
            <Icon
              name={showPassword ? "visibility_off" : "visibility"}
              className="text-[20px]"
            />
          </button>
        </div>
      </Field>
      <label className="flex cursor-pointer items-center gap-2 pt-1">
        <input
          checked={remember}
          className="h-4 w-4 accent-primary"
          type="checkbox"
          onChange={(event) => setRemember(event.target.checked)}
        />
        <span className="type-caption text-on-surface-variant">
          Ingat saya di perangkat ini
        </span>
      </label>
      {formError ? (
        <p className="type-body text-error" role="alert">
          {formError}
        </p>
      ) : null}
      <button className="btn-primary mt-1 w-full !min-h-12" disabled={pending} type="submit">
        {pending ? "Memproses…" : "Masuk Sekarang"}
        {!pending ? <Icon name="arrow_forward" className="text-[18px]" /> : null}
      </button>
      <div className="relative my-1 flex items-center justify-center">
        <div className="h-px w-full bg-surface-container" />
        <span className="absolute bg-surface-container-lowest px-3 type-micro uppercase text-on-surface-variant">
          atau masuk dengan
        </span>
      </div>
      <button
        className="flex w-full items-center justify-center gap-3 rounded-full bg-surface-container-low py-2.5 type-label text-on-surface hover:bg-surface-container"
        type="button"
        disabled
        title="Google SSO menyusul setelah kontrak Alya"
      >
        <GoogleMark />
        Akun Google
      </button>
      <p className="type-caption text-center text-on-surface-variant">
        Belum punya akun DOLAN?{" "}
        <Link
          href={
            next
              ? `${ROUTES.daftar}?next=${encodeURIComponent(next)}`
              : ROUTES.daftar
          }
          className="type-label font-semibold text-primary hover:underline"
        >
          Daftar sekarang gratis
        </Link>
      </p>
    </form>
  );
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.39 7.36 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12c0 2.06.46 3.84 1.26 5.42l4.02-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.27 2.61 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  );
}

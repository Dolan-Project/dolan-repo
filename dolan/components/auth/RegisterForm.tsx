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
      | { success: true; data: AuthSession }
      | ApiError;
    setPending(false);
    if (!json.success) {
      setFormError(json.error.message);
      setFieldErrors(json.error.fields ?? {});
      return;
    }
    const params = new URLSearchParams({ email });
    if (next) params.set("next", next);
    router.push(`${ROUTES.cekEmail}?${params.toString()}`);
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <Field
        id="email"
        label="Email Aktif"
        error={fieldErrors.email}
        hint="Tautan verifikasi akan dikirim ke email ini."
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field-input"
          placeholder="contoh: rani.explorer@gmail.com"
          value={email}
          aria-invalid={Boolean(fieldErrors.email)}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field id="displayName" label="Nama tampilan" error={fieldErrors.displayName}>
        <input
          id="displayName"
          name="displayName"
          className="field-input"
          placeholder="Contoh: Rani Explorer"
          value={displayName}
          aria-invalid={Boolean(fieldErrors.displayName)}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </Field>
      <Field id="username" label="Username" error={fieldErrors.username} hint="Huruf, angka, titik, atau underscore. Bisa dilengkapi nanti di profil.">
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
      <Field id="password" label="Kata Sandi Baru" error={fieldErrors.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field-input"
          value={password}
          aria-invalid={Boolean(fieldErrors.password)}
          onChange={(event) => setPassword(event.target.value)}
        />
        {password ? (
          <div className="mt-1 flex flex-col gap-1">
            <div className="flex items-center justify-between type-micro">
              <span className="text-on-surface-variant">Kekuatan Kata Sandi:</span>
              <span className="font-bold text-tertiary">
                {score >= 3 ? "Kuat (Aman untuk Komunitas)" : score === 2 ? "Cukup" : "Lemah"}
              </span>
            </div>
            <div className="grid h-1.5 grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`rounded-full ${
                    index < score ? "bg-tertiary" : "bg-surface-container-highest"
                  }`}
                />
              ))}
            </div>
            <span className="type-caption text-on-surface-variant">
              Minimal 8 karakter. Huruf kapital, angka, dan simbol membuatnya lebih kuat.
            </span>
          </div>
        ) : (
          <p className="type-caption text-on-surface-variant">Minimal 8 karakter.</p>
        )}
      </Field>
      <Field
        id="confirmPassword"
        label="Ulangi Kata Sandi"
        error={fieldErrors.confirmPassword}
      >
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
      <label className="flex items-start gap-2.5 rounded-xl bg-surface-container-low p-3">
        <input
          checked={agreed}
          className="mt-0.5 h-4 w-4 accent-primary"
          type="checkbox"
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <span className="type-caption text-on-surface-variant">
          Saya menyetujui syarat & ketentuan, menghormati sesama penjelajah, dan
          mematuhi etika keselamatan open-trip.
        </span>
      </label>
      {formError ? (
        <p className="type-body text-error" role="alert">
          {formError}{" "}
          {formError.includes("terdaftar") ? (
            <Link href={ROUTES.masuk} className="type-label text-primary">
              Masuk
            </Link>
          ) : null}
        </p>
      ) : null}
      <button className="btn-primary w-full !min-h-12" disabled={pending} type="submit">
        {pending ? "Memproses…" : "Buat Akun & Kirim Tautan"}
        {!pending ? <Icon name="mail" className="text-[18px]" /> : null}
      </button>
      <p className="type-caption text-center text-on-surface-variant">
        Sudah punya akun?{" "}
        <Link href={ROUTES.masuk} className="type-label font-semibold text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}

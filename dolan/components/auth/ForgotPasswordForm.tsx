"use client";

import { AUTH_PATHS, type ApiError } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/auth/Field";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError("");
    const response = await fetch(AUTH_PATHS.forgotPassword, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = (await response.json()) as
      | { success: true; data: { message: string } }
      | ApiError;
    setPending(false);
    if (!json.success) {
      setFormError(json.error.message);
      return;
    }
    const params = new URLSearchParams({ email, type: "reset" });
    router.push(`${ROUTES.cekEmail}?${params.toString()}`);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <Field id="email" label="Email Terdaftar">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field-input"
          placeholder="nama@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <div className="flex items-start gap-3 rounded-xl bg-surface-container-low p-3">
        <Icon name="info" className="mt-0.5 text-[20px] text-secondary" />
        <p className="type-caption text-on-surface-variant">
          Untuk keamanan perjalanan grup aktif, tautan reset kedaluwarsa setelah
          30 menit.
        </p>
      </div>
      {formError ? (
        <p className="type-body text-error" role="alert">
          {formError}
        </p>
      ) : null}
      <button className="btn-brand w-full !min-h-12" disabled={pending} type="submit">
        {pending ? "Memproses…" : "Kirim Tautan Pemulihan"}
      </button>
    </form>
  );
}

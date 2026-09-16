"use client";

import { AUTH_PATHS, type ApiError } from "@/lib/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/auth/Field";
import { ROUTES } from "@/lib/routes";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError("");
    setFieldErrors({});
    const response = await fetch(AUTH_PATHS.resetPassword, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const json = (await response.json()) as
      | { success: true; data: { message: string } }
      | ApiError;
    setPending(false);
    if (!json.success) {
      setFormError(json.error.message);
      setFieldErrors(json.error.fields ?? {});
      return;
    }
    router.push(ROUTES.masuk);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
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
          onChange={(event) => setPassword(event.target.value)}
        />
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
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </Field>
      {formError ? (
        <p className="type-body text-error" role="alert">
          {formError}
        </p>
      ) : null}
      <button className="btn-brand w-full !min-h-12" disabled={pending} type="submit">
        {pending ? "Memproses…" : "Simpan Kata Sandi Baru"}
      </button>
    </form>
  );
}

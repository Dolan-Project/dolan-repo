"use client";

import { AUTH_PATHS, type ApiError } from "@/lib/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";

type CekEmailActionsProps = {
  email?: string;
  next?: string;
  isReset: boolean;
  error?: string;
  debugToken?: string;
};

export function CekEmailActions({ email, next, isReset, error, debugToken }: CekEmailActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  const debugVerifyHref = debugToken
    ? `${AUTH_PATHS.verifyEmail}?${new URLSearchParams({
        token: debugToken,
        ...(next ? { next } : {}),
      }).toString()}`
    : null;

  async function resendVerification() {
    setPending(true);
    setFormError("");
    setMessage("");
    const response = await fetch(AUTH_PATHS.resendVerification, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ next }),
    });
    const json = (await response.json()) as
      | { success: true; data: { message?: string; alreadyVerified?: boolean } }
      | ApiError;
    setPending(false);
    if (!json.success) {
      setFormError(json.error.message);
      return;
    }
    if (json.data.alreadyVerified) {
      router.push(next || ROUTES.beranda);
      router.refresh();
      return;
    }
    setMessage(json.data.message ?? "Tautan verifikasi telah dikirim ulang.");
  }

  return (
    <div className="mt-4 flex w-full flex-col gap-2">
      {error ? (
        <p className="type-body text-error" role="alert">
          Tautan tidak valid atau kedaluwarsa.
        </p>
      ) : null}
      {formError ? (
        <p className="type-body text-error" role="alert">
          {formError}
        </p>
      ) : null}
      {message ? (
        <p className="type-body text-primary" role="status">
          {message}
        </p>
      ) : null}

      {isReset ? (
        <>
          <p className="type-caption text-on-surface-variant">
            Buka email{email ? ` di ${email}` : ""} dan klik tautan reset. Halaman ini tidak
            memverifikasi otomatis.
          </p>
          <Link href={ROUTES.lupaPassword} className="btn-primary w-full !min-h-12">
            Kirim ulang tautan reset
          </Link>
          <Link
            href={ROUTES.masuk}
            className="rounded-full py-2.5 type-label text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          >
            Kembali ke masuk
          </Link>
        </>
      ) : (
        <>
          <p className="type-caption text-on-surface-variant">
            Setelah membuka tautan di email, kamu akan langsung masuk ke Dolan.
          </p>
          {debugVerifyHref ? (
            <a href={debugVerifyHref} className="btn-primary w-full !min-h-12">
              Verifikasi sekarang (dev — email gagal terkirim)
            </a>
          ) : null}
          <button
            type="button"
            className={`${debugVerifyHref ? "rounded-full border border-outline-variant py-3 type-label" : "btn-primary w-full !min-h-12"}`}
            disabled={pending}
            onClick={() => void resendVerification()}
          >
            {pending ? "Mengirim…" : "Kirim ulang tautan verifikasi"}
          </button>
          <Link
            href={ROUTES.masuk}
            className="rounded-full py-2.5 type-label text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          >
            Sudah verifikasi? Masuk
          </Link>
        </>
      )}

      <div className="mt-2 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 text-left">
        <Icon name="info" className="mt-0.5 text-[20px] text-secondary" />
        <p className="type-caption text-on-surface-variant">
          Cek folder spam jika email belum muncul dalam beberapa menit.
        </p>
      </div>
    </div>
  );
}

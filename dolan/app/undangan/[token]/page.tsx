"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";

type Preview = { tripId: string; title: string; destinationCity: string | null; startDate: string | null; endDate: string | null; requiresLogin: boolean };

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => { void fetch(`/api/v1/trip-invitations/${encodeURIComponent(token)}/preview`).then(async (response) => {
    const payload = await response.json() as { success: boolean; data?: Preview; error?: { message?: string } };
    if (!response.ok || !payload.success || !payload.data) setError(payload.error?.message ?? "Undangan tidak tersedia.");
    else setPreview(payload.data);
  }); }, [token]);
  const accept = async () => {
    setPending(true);
    const response = await fetch(`/api/v1/trip-invitations/${encodeURIComponent(token)}/accept`, { method: "POST", credentials: "include" });
    const payload = await response.json() as { success: boolean; data?: { tripId: string }; error?: { message?: string } };
    setPending(false);
    if (response.status === 401) { router.push(`${ROUTES.masuk}?next=${encodeURIComponent(`/undangan/${token}`)}`); return; }
    if (!response.ok || !payload.success || !payload.data) { setError(payload.error?.message ?? "Undangan gagal diterima."); return; }
    router.push(ROUTES.trip(payload.data.tripId));
  };
  return <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-margin py-12"><section className="card-surface w-full p-6 md:p-9"><p className="type-micro uppercase text-secondary">Undangan trip privat</p>{error ? <p className="mt-4 rounded-xl bg-error-container p-4 text-error">{error}</p> : !preview ? <p className="mt-4">Memuat undangan…</p> : <><h1 className="type-title mt-2">{preview.title}</h1><p className="type-body mt-2 text-on-surface-variant">{preview.destinationCity ?? "Tujuan sedang disusun"} · {preview.startDate ?? "Tanggal fleksibel"} – {preview.endDate ?? ""}</p><p className="mt-5 rounded-xl bg-primary-fixed/40 p-4 type-caption">Biaya perjalanan ditanggung masing-masing peserta. Menerima undangan ini tidak memungut pembayaran.</p><div className="mt-6 flex gap-3"><button className="btn-primary" disabled={pending} onClick={() => void accept()}>{pending ? "Memproses…" : preview.requiresLogin ? "Masuk lalu terima" : "Terima undangan"}</button><Link href={ROUTES.beranda} className="btn-ghost">Nanti saja</Link></div></>}</section></main>;
}

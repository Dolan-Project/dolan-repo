export type ChatLinkState = "connecting" | "online" | "offline";

export function chatStatusLabel(state: ChatLinkState, everOnline: boolean) {
  if (state === "online") return "Terhubung";
  if (!everOnline) return "Menghubungkan…";
  return "Menyambungkan ulang…";
}

/**
 * Socket.IO surfaces the middleware rejection as a plain Error message, so an
 * expired session arrives here as the raw auth code rather than an API payload.
 */
export function chatConnectErrorText(message: string | undefined) {
  const value = (message ?? "").trim();
  if (value === "UNAUTHENTICATED" || value === "INVALID_TOKEN") {
    return "Sesi berakhir. Masuk lagi untuk membuka chat.";
  }
  return "";
}

export function chatErrorText(codeOrMessage: string | undefined, fallback = "Chat tidak dapat dimuat") {
  const value = (codeOrMessage ?? "").trim();
  if (!value) return fallback;
  if (value === "UNAUTHENTICATED" || value === "INVALID_TOKEN") return "Sesi berakhir. Masuk lagi untuk membuka chat.";
  if (value === "PENDING_MEMBER") return "Chat terbuka setelah host menerima pengajuanmu.";
  if (value === "NOT_MEMBER" || value === "FORBIDDEN") return "Chat khusus host dan peserta yang sudah diterima.";
  if (value === "ROOM_READ_ONLY") return "Trip ini sudah ditutup, chat hanya bisa dibaca.";
  if (value === "NOT_FOUND" || value === "TRIP_NOT_FOUND") return "Trip tidak ditemukan.";
  if (/^[A-Z][A-Z0-9_]+$/.test(value)) return fallback;
  return value;
}

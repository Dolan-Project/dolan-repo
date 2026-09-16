import { describe, expect, it } from "vitest";
import { chatErrorText, chatStatusLabel } from "./chat-status";

describe("chat status copy", () => {
  it("keeps reconnecting label off until a session has been online", () => {
    expect(chatStatusLabel("connecting", false)).toBe("Menghubungkan…");
    expect(chatStatusLabel("offline", false)).toBe("Menghubungkan…");
    expect(chatStatusLabel("online", true)).toBe("Terhubung");
    expect(chatStatusLabel("offline", true)).toBe("Menyambungkan ulang…");
  });

  it("maps socket codes to readable Indonesian copy", () => {
    expect(chatErrorText("FORBIDDEN")).toBe("Chat khusus host dan peserta yang sudah diterima.");
    expect(chatErrorText("PENDING_MEMBER")).toMatch(/pengajuan/i);
    expect(chatErrorText("Pesan gagal dikirim")).toBe("Pesan gagal dikirim");
  });
});

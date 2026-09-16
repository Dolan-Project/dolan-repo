import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/contracts";
import { displayInitials, groupMessagesByDay, messageDayLabel, startsNewBurst, tripRoomStatusBadge } from "./chat-format";

const now = new Date("2026-09-16T10:00:00+07:00");

function message(id: string, sentAt: string, senderId = "u1"): ChatMessage {
  return {
    id,
    tripId: "t1",
    clientMessageId: id,
    body: id,
    sentAt,
    sender: { id: senderId, username: senderId, displayName: senderId, avatarUrl: null, domicile: null },
  } as ChatMessage;
}

describe("messageDayLabel", () => {
  it("names today and yesterday instead of printing a date", () => {
    expect(messageDayLabel("2026-09-16T08:30:00+07:00", now)).toBe("Hari ini");
    expect(messageDayLabel("2026-09-15T23:30:00+07:00", now)).toBe("Kemarin");
  });

  it("falls back to a formatted date for older messages", () => {
    expect(messageDayLabel("2026-09-10T08:00:00+07:00", now)).toMatch(/2026/);
  });

  it("returns empty text for an unparsable timestamp", () => {
    expect(messageDayLabel("not-a-date", now)).toBe("");
  });
});

describe("groupMessagesByDay", () => {
  it("splits messages into one group per calendar day, keeping order", () => {
    const groups = groupMessagesByDay(
      [
        message("a", "2026-09-15T09:00:00+07:00"),
        message("b", "2026-09-15T21:00:00+07:00"),
        message("c", "2026-09-16T07:00:00+07:00"),
      ],
      now,
    );
    expect(groups.map((group) => group.label)).toEqual(["Kemarin", "Hari ini"]);
    expect(groups[0].messages.map((item) => item.id)).toEqual(["a", "b"]);
    expect(groups[1].messages.map((item) => item.id)).toEqual(["c"]);
  });

  it("returns nothing for an empty room", () => {
    expect(groupMessagesByDay([], now)).toEqual([]);
  });
});

describe("tripRoomStatusBadge", () => {
  it("maps trip lifecycle to the room-list labels from the design", () => {
    expect(tripRoomStatusBadge("ONGOING")).toEqual({ label: "Sedang berjalan", tone: "live" });
    expect(tripRoomStatusBadge("OPEN")).toEqual({ label: "Trip terbuka", tone: "open" });
    expect(tripRoomStatusBadge("DRAFT")).toEqual({ label: "Tahap diskusi", tone: "soon" });
    expect(tripRoomStatusBadge("COMPLETED")).toEqual({ label: "Trip selesai", tone: "done" });
  });
});

describe("displayInitials", () => {
  it("takes the first letters of a two-word name", () => {
    expect(displayInitials("Dimas Anggara")).toBe("DA");
    expect(displayInitials("Sita")).toBe("SI");
  });
});

describe("startsNewBurst", () => {
  it("starts a burst for the first message and on sender change", () => {
    expect(startsNewBurst(undefined, message("a", "2026-09-16T09:00:00+07:00"))).toBe(true);
    expect(
      startsNewBurst(message("a", "2026-09-16T09:00:00+07:00", "u1"), message("b", "2026-09-16T09:01:00+07:00", "u2")),
    ).toBe(true);
  });

  it("keeps quick replies from one sender in the same burst", () => {
    expect(
      startsNewBurst(message("a", "2026-09-16T09:00:00+07:00"), message("b", "2026-09-16T09:03:00+07:00")),
    ).toBe(false);
    expect(
      startsNewBurst(message("a", "2026-09-16T09:00:00+07:00"), message("b", "2026-09-16T09:30:00+07:00")),
    ).toBe(true);
  });
});

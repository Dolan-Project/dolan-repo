import { describe, expect, it } from "vitest";
import { parseNotificationsResponse } from "./notifications";

describe("parseNotificationsResponse", () => {
  it("reads the live apiPage array plus unreadCount", () => {
    const parsed = parseNotificationsResponse({
      success: true,
      unreadCount: 2,
      data: [
        {
          id: "n1",
          type: "join_request.created",
          targetType: "trip",
          targetId: "t1",
          data: { tripTitle: "Trip ke Bandung" },
          readAt: null,
          createdAt: "2026-09-15T00:00:00.000Z",
        },
      ],
    });
    expect(parsed.unreadCount).toBe(2);
    expect(parsed.items[0]).toMatchObject({
      title: "Pengajuan join trip",
      body: "Ada yang ingin join “Trip ke Bandung”.",
      href: "/trip/t1",
      tripId: "t1",
    });
  });

  it("keeps the mock { items, unreadCount } shape", () => {
    const parsed = parseNotificationsResponse({
      success: true,
      data: {
        unreadCount: 1,
        items: [
          {
            id: "notif_1",
            title: "Pengajuan join",
            body: "Host akan meninjau pengajuan kamu.",
            tripId: "trip_1",
            readAt: null,
            createdAt: "2026-09-12T01:00:00.000Z",
          },
        ],
      },
    });
    expect(parsed.unreadCount).toBe(1);
    expect(parsed.items[0].href).toBe("/trip/trip_1");
  });

  it("uses stored copy when the row has no type, and counts unread items", () => {
    expect(parseNotificationsResponse({ success: false })).toEqual({ items: [], unreadCount: 0 });
    const parsed = parseNotificationsResponse({
      success: true,
      data: {
        items: [
          {
            id: "n2",
            title: "Custom",
            body: "Isi custom",
            tripId: "t2",
            readAt: null,
            createdAt: "2026-09-15T00:00:00.000Z",
          },
          {
            id: "n3",
            title: "Read",
            body: "Sudah dibaca",
            href: "/notifikasi",
            readAt: "2026-09-15T01:00:00.000Z",
            createdAt: "2026-09-15T00:00:00.000Z",
          },
        ],
      },
    });
    expect(parsed.items[0]).toMatchObject({ title: "Custom", href: "/trip/t2" });
    expect(parsed.unreadCount).toBe(1);
  });
});

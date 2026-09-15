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
});

import { describe, expect, it } from "vitest";
import { presentInboxNotification } from "./notification-copy.ts";

describe("presentInboxNotification", () => {
  it("names the trip on join request, accept, and chat copy", () => {
    expect(
      presentInboxNotification({
        type: "join_request.created",
        targetType: "trip",
        targetId: "t1",
        data: { tripTitle: "Trip ke Bandung" },
      }),
    ).toMatchObject({
      title: "Pengajuan join trip",
      body: "Ada yang ingin join “Trip ke Bandung”.",
      href: "/trip/t1",
      tripId: "t1",
    });

    expect(
      presentInboxNotification({
        type: "join_request.reviewed",
        targetType: "trip",
        targetId: "t1",
        data: { tripTitle: "Trip ke Bandung", decision: "accept" },
      }),
    ).toMatchObject({
      title: "Pengajuan diterima",
      body: "Pengajuanmu untuk “Trip ke Bandung” diterima.",
    });

    expect(
      presentInboxNotification({
        type: "message.created",
        targetType: "trip",
        targetId: "t1",
        data: {
          tripTitle: "Trip ke Medan",
          actorUsername: "rusdi",
          actorName: "Rusdi",
          preview: "okee",
        },
      }),
    ).toMatchObject({
      title: "Trip ke Medan",
      body: "rusdi: okee",
      href: "/trip/t1/chat",
    });

    expect(
      presentInboxNotification({
        type: "comment.created",
        targetType: "trip",
        targetId: "t1",
        data: { tripTitle: "Trip ke Bandung", actorName: "Budi", preview: "Boleh join?" },
      }),
    ).toMatchObject({
      title: "Budi memberikan komentar pada trip Trip ke Bandung",
      body: "Budi: Boleh join?",
      href: "/trip/t1",
    });
  });

  it("treats join.rejected and decision reject as a denial", () => {
    expect(
      presentInboxNotification({
        type: "join_request.reviewed",
        targetType: "trip",
        targetId: "t1",
        data: { decision: "reject" },
      }).title,
    ).toBe("Pengajuan ditolak");
  });
});

import { describe, expect, it } from "vitest";
import {
  completedTripsForFeedback,
  reviewTripForPeer,
  tripsFromMinePayload,
  type TripForFeedback,
} from "./completed-feedback";

const completedWithWayan: TripForFeedback = {
  id: "abc-uuid",
  title: "Sailing Komodo",
  status: "COMPLETED",
  hostUsername: "wayan",
};

const openWithWayan: TripForFeedback = {
  id: "trip_open",
  title: "Open Canggu",
  status: "OPEN",
  hostUsername: "wayan",
};

describe("completedTripsForFeedback", () => {
  it("keeps completed trips only and does not treat trip_completed as a fallback id", () => {
    const rows = completedTripsForFeedback([
      openWithWayan,
      completedWithWayan,
      { id: "trip_completed", title: "Fake", status: "OPEN", hostUsername: "wayan" },
      completedWithWayan,
    ]);
    expect(rows.map((row) => row.id)).toEqual(["abc-uuid"]);
  });
});

describe("reviewTripForPeer", () => {
  it("binds the review to the completed trip hosted by that peer", () => {
    const picked = reviewTripForPeer(
      [
        openWithWayan,
        completedWithWayan,
        { id: "mine", title: "Jogja", status: "COMPLETED", hostUsername: "salsa" },
      ],
      "wayan",
    );
    expect(picked?.id).toBe("abc-uuid");
  });

  it("returns null when the peer did not host a completed trip the viewer joined", () => {
    expect(reviewTripForPeer([completedWithWayan], "private_host")).toBeNull();
    expect(reviewTripForPeer([openWithWayan], "wayan")).toBeNull();
  });

  it("uses a preferred completed trip id from the attendance page", () => {
    const hosted = {
      id: "host-done",
      title: "Jogja selesai",
      status: "COMPLETED" as const,
      hostUsername: "salsa",
    };
    expect(reviewTripForPeer([hosted, completedWithWayan], "budi", "host-done")?.id).toBe("host-done");
    expect(reviewTripForPeer([hosted, completedWithWayan], "wayan", "abc-uuid")?.id).toBe("abc-uuid");
    expect(reviewTripForPeer([completedWithWayan], "wayan", "missing")).toEqual(completedWithWayan);
  });
});

describe("tripsFromMinePayload", () => {
  it("reads Express page data and mock arrays the same way", () => {
    const rows = tripsFromMinePayload({
      success: true,
      data: [
        { id: "abc-uuid", title: "Sailing Komodo", status: "COMPLETED", host: { username: "wayan" } },
        { id: "skip", title: "Draft", status: "DRAFT" },
      ],
    });
    expect(rows).toEqual([completedWithWayan]);
  });
});

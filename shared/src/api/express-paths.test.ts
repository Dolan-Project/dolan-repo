import { describe, expect, it } from "vitest";
import {
  API_V1_PREFIX,
  EXPRESS_PATHS,
  joinRequestReviewPath,
  joinRequestWithdrawPath,
  tripCommentsPath,
  tripJoinRequestsPath,
  tripMessagesPath,
  tripPath,
  userByUsernamePath,
} from "./express-paths.js";

describe("EXPRESS_PATHS", () => {
  it("uses /api/v1 prefix", () => {
    expect(API_V1_PREFIX).toBe("/api/v1");
    expect(EXPRESS_PATHS.usersMe).toBe("/users/me");
    expect(EXPRESS_PATHS.usersMeAvatar).toBe("/users/me/avatar");
    expect(EXPRESS_PATHS.usersMeCover).toBe("/users/me/cover");
    expect(EXPRESS_PATHS.trips).toBe("/trips");
    expect(EXPRESS_PATHS.tripsMe).toBe("/trips/me");
  });

  it("builds resource paths", () => {
    expect(userByUsernamePath("salsa")).toBe("/users/salsa");
    expect(tripPath("t1")).toBe("/trips/t1");
    expect(tripJoinRequestsPath("t1")).toBe("/trips/t1/join-requests");
    expect(joinRequestReviewPath("j1")).toBe("/join-requests/j1/review");
    expect(joinRequestWithdrawPath("j1")).toBe("/join-requests/j1/withdraw");
    expect(tripCommentsPath("t1")).toBe("/trips/t1/comments");
    expect(tripMessagesPath("t1")).toBe("/trips/t1/messages");
  });
});

import { describe, expect, it } from "vitest";
import { TripErrorCode } from "@dolan/shared";
import { MemorySocialStore } from "../src/modules/social/social-queries.ts";

const ALYA = "11111111-1111-4111-8111-111111111111";
const BUDI = "55555555-5555-4555-8555-555555555555";

describe("social query helpers for Salsa", () => {
  it("rejects self-follow, counts followers, and drops follows on block", async () => {
    const social = new MemorySocialStore();
    await expect(social.follow(ALYA, ALYA)).rejects.toMatchObject({ code: "SELF_FOLLOW" });

    await social.follow(ALYA, BUDI);
    await expect(social.follow(ALYA, BUDI)).rejects.toMatchObject({ code: "ALREADY_FOLLOWING" });
    expect(await social.countFollowing(ALYA)).toBe(1);
    expect(await social.countFollowers(BUDI)).toBe(1);

    await social.block(BUDI, ALYA);
    expect(await social.isBlockedEitherWay(ALYA, BUDI)).toBe(true);
    expect(await social.countFollowing(ALYA)).toBe(0);
    await expect(social.follow(ALYA, BUDI)).rejects.toMatchObject({ code: TripErrorCode.BLOCKED_RELATION });
  });

  it("averages visible reviews only", async () => {
    const social = new MemorySocialStore();
    social.reviews.push(
      { revieweeUserId: BUDI, communicationRating: 4, attitudeRating: 2, moderationStatus: "VISIBLE" },
      { revieweeUserId: BUDI, communicationRating: 5, attitudeRating: 5, moderationStatus: "HIDDEN" },
    );
    expect(await social.ratingFor(BUDI)).toEqual({
      overall: 3,
      communication: 4,
      attitude: 2,
      reviewCount: 1,
    });
  });
});

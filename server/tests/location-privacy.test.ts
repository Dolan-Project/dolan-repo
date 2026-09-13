import { describe, expect, it } from "vitest";
import {
  approximatePublicPoint,
  HIDE_AFTER_MS,
  locationFreshness,
  presentLocation,
  shareExpiresAt,
  STALE_AFTER_MS,
} from "../src/modules/location/location-privacy.ts";

describe("location privacy", () => {
  const now = new Date("2026-09-12T12:00:00.000Z");

  it("marks live, stale, and hidden windows", () => {
    expect(locationFreshness(new Date(now.getTime() - 30_000), now)).toBe("LIVE");
    expect(locationFreshness(new Date(now.getTime() - STALE_AFTER_MS), now)).toBe("STALE");
    expect(locationFreshness(new Date(now.getTime() - HIDE_AFTER_MS), now)).toBe("HIDDEN");
  });

  it("quantizes public points to about one kilometer", () => {
    expect(approximatePublicPoint(-7.7928123, 110.3658444)).toEqual({
      latitude: -7.79,
      longitude: 110.37,
    });
  });

  it("hides expired points and approximates for the public", () => {
    expect(
      presentLocation({
        latitude: -7.7928,
        longitude: 110.3658,
        recordedAt: new Date(now.getTime() - HIDE_AFTER_MS),
        scope: "TRIP_PRECISE",
        viewer: "TRIP_MEMBER",
        now,
      }),
    ).toBeNull();

    const publicPoint = presentLocation({
      latitude: -7.7928,
      longitude: 110.3658,
      recordedAt: now,
      scope: "TRIP_PRECISE",
      viewer: "PUBLIC",
      now,
    });
    expect(publicPoint?.latitude).toBe(-7.79);
    expect(publicPoint?.freshness).toBe("LIVE");
  });

  it("expires one-hour shares after 60 minutes", () => {
    const expires = shareExpiresAt("ONE_HOUR", null, now);
    expect(expires.getTime() - now.getTime()).toBe(60 * 60 * 1000);
  });
});

import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiPage, apiSuccess } from "./api/response.ts";
import {
  adminModerateReportPath,
  tripAttendancePath,
  tripCancelPath,
  tripClosePath,
  tripCompletePath,
  tripLeavePath,
  tripPublishPath,
  tripReopenPath,
  tripStartPath,
  tripVisibilityPath,
  userBlockPath,
  userFollowersPath,
  userFollowingPath,
  userFollowPath,
  userHistoryPath,
  userReviewsPath,
} from "./api/express-paths.ts";
import { AuthErrorCode, SearchErrorCode, TripErrorCode } from "./constants/error-codes.ts";
import { presentInboxNotification } from "./lib/notification-copy.ts";
import { instagramProfileUrl, socialHandleFromUrl, tiktokProfileUrl } from "./lib/social-links.ts";
import { sendMessageSchema, listMessagesQuerySchema, markReadSchema } from "./schemas/chat.ts";
import {
  enqueueGenerationSchema,
  geminiItinerarySchema,
  generationJobSchema,
} from "./schemas/generation.ts";
import { pingLocationSchema, startLocationShareSchema } from "./schemas/location.ts";
import {
  citySearchQuerySchema,
  placePhotoQuerySchema,
  placeSearchQuerySchema,
  templateSearchQuerySchema,
  tripSearchQuerySchema,
} from "./schemas/search.ts";
import { createPostCommentBodySchema, createPostFieldsSchema } from "./schemas/post.ts";
import {
  attendanceBodySchema,
  createReportBodySchema,
  createReviewBodySchema,
  moderateReportBodySchema,
  pushSubscriptionBodySchema,
} from "./schemas/social.ts";
import { useTemplateBodySchema } from "./schemas/template.ts";
import { fieldErrorsFromZod } from "./schemas/zod-fields.ts";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("api envelopes", () => {
  it("wraps success and paginated payloads", () => {
    expect(apiSuccess({ ok: true })).toEqual({ success: true, data: { ok: true } });
    expect(apiPage(["a"], 1, 10, 1).pagination).toMatchObject({
      totalPages: 1,
      hasNextPage: false,
    });
    expect(apiPage(["a"], 1, 0, 5).pagination.totalPages).toBe(0);
    expect(apiPage(["a", "b"], 1, 1, 2).pagination.hasNextPage).toBe(true);
  });
});

describe("error code catalogs", () => {
  it("exports auth, search, and trip codes", () => {
    expect(AuthErrorCode.FORBIDDEN).toBe("FORBIDDEN");
    expect(SearchErrorCode.PLACE_NOT_FOUND).toBe("PLACE_NOT_FOUND");
    expect(TripErrorCode.BLOCKED_RELATION).toBe("BLOCKED_RELATION");
  });
});

describe("remaining express paths", () => {
  it("builds trip lifecycle and social paths", () => {
    expect(tripPublishPath("t1")).toBe("/trips/t1/publish");
    expect(tripLeavePath("t1")).toBe("/trips/t1/leave");
    expect(tripClosePath("t1")).toBe("/trips/t1/close");
    expect(tripReopenPath("t1")).toBe("/trips/t1/reopen");
    expect(tripStartPath("t1")).toBe("/trips/t1/start");
    expect(tripCompletePath("t1")).toBe("/trips/t1/complete");
    expect(tripCancelPath("t1")).toBe("/trips/t1/cancel");
    expect(tripVisibilityPath("t1")).toBe("/trips/t1/visibility");
    expect(userFollowPath("Alya")).toBe("/users/Alya/follow");
    expect(userFollowersPath("Alya")).toBe("/users/Alya/followers");
    expect(userFollowingPath("Alya")).toBe("/users/Alya/following");
    expect(userBlockPath("Alya")).toBe("/users/Alya/block");
    expect(userReviewsPath("Alya")).toBe("/users/Alya/reviews");
    expect(userHistoryPath("Alya")).toBe("/users/Alya/history");
    expect(tripAttendancePath("t1")).toBe("/trips/t1/attendance");
    expect(adminModerateReportPath("r1")).toBe("/admin/reports/r1/moderate");
  });
});

describe("zod field errors", () => {
  it("maps the first issue per path and uses form for empty paths", () => {
    const schema = z.object({ name: z.string().min(2) });
    const error = schema.safeParse({ name: "x" }).error!;
    expect(fieldErrorsFromZod(error).name).toBeTruthy();
    const formError = z.string().safeParse(1).error!;
    expect(fieldErrorsFromZod(formError).form).toBeTruthy();
  });
});

describe("remaining schemas", () => {
  it("accepts chat, location, post, social, template, and generation payloads", () => {
    expect(sendMessageSchema.parse({ clientMessageId: uuid, body: "halo" }).body).toBe("halo");
    expect(listMessagesQuerySchema.parse({}).limit).toBe(20);
    expect(markReadSchema.parse({ lastReadMessageId: uuid }).lastReadMessageId).toBe(uuid);
    expect(startLocationShareSchema.parse({}).duration).toBe("ONE_HOUR");
    expect(pingLocationSchema.parse({ latitude: -6.9, longitude: 107.6 }).latitude).toBe(-6.9);
    expect(createPostFieldsSchema.parse({}).caption).toBe("");
    expect(createPostCommentBodySchema.parse({ body: "nice" }).body).toBe("nice");
    expect(attendanceBodySchema.parse({}).confirmed).toBe(true);
    expect(createReviewBodySchema.parse({ tripId: uuid, communication: 5, attitude: 4 }).attitude).toBe(4);
    expect(
      pushSubscriptionBodySchema.parse({
        endpoint: "https://push.example/sub",
        keys: { p256dh: "abc", auth: "def" },
      }).endpoint,
    ).toContain("push");
    expect(createReportBodySchema.parse({ targetType: "user", targetId: "u1", reason: "spam" }).reason).toBe("spam");
    expect(moderateReportBodySchema.parse({ action: "hide" }).action).toBe("hide");
    expect(useTemplateBodySchema.parse({ startDate: "2026-11-01" }).planningPartySize).toBe(1);
    expect(useTemplateBodySchema.safeParse({ startDate: "2026-11-02", endDate: "2026-11-01" }).success).toBe(false);
    expect(enqueueGenerationSchema.parse({ idempotencyKey: uuid }).type).toBe("GENERATE_ITINERARY");
    expect(citySearchQuerySchema.parse({ q: ["bali"] }).q).toBe("bali");
    expect(placeSearchQuerySchema.parse({ q: ["gedung sate"] }).q).toBe("gedung sate");
    expect(placeSearchQuerySchema.parse({ q: "gedung sate", lat: "", lng: "" }).sort).toBe("relevance");
    expect(tripSearchQuerySchema.parse({ q: "", sort: "popular" }).sort).toBe("popular");
    expect(templateSearchQuerySchema.parse({ city: "" }).sort).toBe("popular");
    expect(placePhotoQuerySchema.safeParse({}).success).toBe(false);
    expect(placePhotoQuerySchema.parse({ name: ["places/abc/photos/1"] }).name).toContain("photos");
    expect(
      generationJobSchema.parse({
        id: uuid,
        tripId: "t1",
        requestedBy: uuid,
        type: "GENERATE_ITINERARY",
        status: "QUEUED",
        attemptCount: 0,
        resultVersionId: null,
        selectedVersionId: null,
        errorCode: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }).status,
    ).toBe("QUEUED");
    expect(
      geminiItinerarySchema.parse({
        summary: "Bandung",
        assumptions: [],
        days: [
          {
            dayNumber: 1,
            date: "2026-11-01",
            title: "Hari 1",
            stops: [
              {
                sequence: 1,
                place: { googlePlaceId: "ChIJ123", name: "Gedung Sate", city: "Bandung" },
                customTitle: null,
                activityType: "wisata",
                startTime: "08:00",
                durationMinutes: 90,
                travelDurationMinutes: 0,
                notes: null,
                isLocked: false,
              },
            ],
          },
        ],
        budgetItems: [],
      }).days,
    ).toHaveLength(1);
  });
});

describe("notification copy remaining types", () => {
  it("covers cancel, update, leave, invite, follow, and fallback copy", () => {
    expect(presentInboxNotification({ type: "join.rejected", targetType: "trip", targetId: "t1" }).title).toBe(
      "Pengajuan ditolak",
    );
    expect(presentInboxNotification({ type: "join.requested" }).body).toMatch(/bergabung/i);
    expect(presentInboxNotification({ type: "trip.cancelled", data: { tripTitle: "Bandung" } }).title).toBe(
      "Trip dibatalkan",
    );
    expect(presentInboxNotification({ type: "trip.deleted" }).href).toBe("/trip-saya");
    expect(presentInboxNotification({ type: "trip.updated" }).title).toBe("Trip diperbarui");
    expect(presentInboxNotification({ type: "member.left", data: { tripTitle: "Medan" } }).body).toMatch(/keluar/);
    expect(presentInboxNotification({ type: "comment.created" }).title).toMatch(/komentar/i);
    expect(presentInboxNotification({ type: "feedback.invite", targetType: "trip", targetId: "t1" }).href).toBe(
      "/trip/t1",
    );
    expect(
      presentInboxNotification({ type: "trip.invited", data: { invitePath: "/invite/x", tripTitle: "Bali" } }).href,
    ).toBe("/invite/x");
    expect(presentInboxNotification({ type: "follower.created" }).title).toBe("Pengikut baru");
    expect(presentInboxNotification({ type: "post.commented" }).title).toMatch(/Komentar/);
    expect(presentInboxNotification({ type: "unknown" }).title).toBe("Notifikasi Dolan");
    expect(
      presentInboxNotification({
        type: "message.created",
        data: JSON.stringify({ actorName: "Alya", preview: "x".repeat(200) }),
      }).body,
    ).toMatch(/…$/);
    expect(presentInboxNotification({ type: "message.created", data: "{not-json" }).body).toMatch(/pesan/i);
    expect(socialHandleFromUrl("not a url")).toBe("");
    expect(presentInboxNotification({ type: "trip.deleted", data: { tripTitle: "Bali" } }).body).toMatch(/menghapus/);
    expect(presentInboxNotification({ type: "feedback.invite", data: { tripTitle: "Bandung" } }).body).toMatch(/Bandung/);
    expect(presentInboxNotification({ type: "message.created", data: JSON.stringify([1, 2]) }).body).toMatch(/pesan/i);
    expect(instagramProfileUrl("https://www.instagram.com/")).toBeNull();
    expect(tiktokProfileUrl("https://www.tiktok.com/")).toBeNull();
  });
});

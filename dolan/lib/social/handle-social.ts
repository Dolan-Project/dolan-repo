import {
  AuthErrorCode,
  TripErrorCode,
  createCommentBodySchema,
  isProfileComplete,
  joinRequestBodySchema,
  joinReviewBodySchema,
  sendMessageSchema,
  type AuthSession,
  type PublicUser,
  type TripDetail,
  type TripViewerRole,
} from "@/lib/contracts";
import { sampleOtherUser, samplePublicUser } from "@/mocks/fixtures";
import { createApiError } from "@/mocks/scenarios";
import {
  mockCreateComment,
  mockListComments,
  mockListMessages,
  mockListNotifications,
  mockMarkNotificationRead,
  mockRequestJoin,
  mockReviewJoin,
  mockSendMessage,
  mockWithdrawJoin,
} from "@/mocks/social";
import {
  TRIP_HOSTED_ID,
  TRIP_JOINABLE_ID,
  TRIP_PUBLIC_ID,
  resetSocialMocks,
  socialStore,
} from "@/mocks/social-store";
import { isBlockedEitherWay } from "@/mocks/community-store";
import { mockStoredRole, mockTripExists } from "@/mocks/trips";
import { jsonResult, statusForCode, validationError } from "@/lib/auth/api-response";
import { readSessionId } from "@/lib/auth/session-cookie";

export { resetSocialMocks };

type Actor = {
  session: AuthSession | null;
};

function incompleteUser(): PublicUser {
  return {
    ...samplePublicUser,
    username: "",
    displayName: "",
    domicile: null,
    bio: null,
  };
}

function actorFromRequest(request: Request): Actor {
  const sessionId = readSessionId(request.headers.get("cookie"));
  if (!sessionId) return { session: null };
  if (sessionId === "unverified") {
    return {
      session: {
        user: samplePublicUser,
        emailVerified: false,
        profileComplete: isProfileComplete(samplePublicUser),
      },
    };
  }
  if (sessionId === "pending") {
    const user = incompleteUser();
    return {
      session: {
        user,
        emailVerified: true,
        profileComplete: false,
      },
    };
  }
  if (sessionId === "host") {
    return {
      session: {
        user: sampleOtherUser,
        emailVerified: true,
        profileComplete: isProfileComplete(sampleOtherUser),
      },
    };
  }
  return {
    session: {
      user: samplePublicUser,
      emailVerified: true,
      profileComplete: isProfileComplete(samplePublicUser),
    },
  };
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function fail(code: string, message: string) {
  return jsonResult(createApiError(code, message), statusForCode(code));
}

function knownTrip(tripId: string) {
  return (
    tripId === TRIP_PUBLIC_ID ||
    tripId === TRIP_HOSTED_ID ||
    tripId === TRIP_JOINABLE_ID ||
    mockTripExists(tripId)
  );
}

function tripHost(tripId: string): PublicUser {
  if (tripId === TRIP_HOSTED_ID) return samplePublicUser;
  return sampleOtherUser;
}

function myJoin(tripId: string, userId: string) {
  return (
    socialStore()
      .joins.filter((row) => row.tripId === tripId && row.applicant.id === userId)
      .at(-1) ?? null
  );
}

function viewerRole(tripId: string, session: AuthSession | null): TripViewerRole {
  if (!session) return "none";
  if (session.user.id === samplePublicUser.id) {
    const stored = mockStoredRole(tripId);
    if (stored) return stored;
  }
  if (session.user.id === tripHost(tripId).id) return "host";
  const join = myJoin(tripId, session.user.id);
  if (join?.status === "PENDING") return "pending";
  if (join?.status === "ACCEPTED") return "participant";
  return "none";
}

function chatActor(tripId: string, session: AuthSession | null) {
  const role = viewerRole(tripId, session);
  if (role === "host") return "host" as const;
  if (role === "participant") return "participant" as const;
  if (role === "pending") return "pending" as const;
  return "guest" as const;
}

function tripDetail(tripId: string, session: AuthSession | null): TripDetail {
  const host = tripHost(tripId);
  const role = viewerRole(tripId, session);
  const join = session ? myJoin(tripId, session.user.id) : null;
  return {
    id: tripId,
    title:
      tripId === TRIP_HOSTED_ID
        ? "Sailing Liveaboard Phinisi Komodo 4D3N"
        : tripId === TRIP_JOINABLE_ID
          ? "Santai Sore & Sunset Canggu"
          : "Santai Sore & Sunset Canggu",
    description: "Trip publik Dolan. Join gratis — biaya perjalanan mandiri.",
    visibility: "PUBLIC",
    status: "OPEN",
    startDate: "2026-10-24",
    endDate: "2026-10-27",
    timezone: "Asia/Makassar",
    destinationCity: tripId === TRIP_HOSTED_ID ? "Labuan Bajo" : "Canggu",
    transportMode: "MIXED",
    budgetAmount: "1500000",
    budgetBasis: "PER_PERSON",
    currency: "IDR",
    planningPartySize: 2,
    maxParticipants: 7,
    publicMeetingPointLabel: tripId === TRIP_HOSTED_ID ? "Bandara LBJ" : "Pantai Batu Bolong",
    publicMeetingPointLatitude: null,
    publicMeetingPointLongitude: null,
    privateOriginLabel: null,
    privateOriginLatitude: null,
    privateOriginLongitude: null,
    preferences: null,
    host,
    viewerRole: role,
    activeParticipantCount: 3,
    pendingRequestCount: socialStore().joins.filter(
      (row) => row.tripId === tripId && row.status === "PENDING",
    ).length,
    joinFree: true,
    currentItineraryVersionId: null,
    myJoinRequest: role === "host" ? null : join,
  };
}

export async function handleGetTripRequest(request: Request, tripId: string) {
  if (!knownTrip(tripId)) {
    return fail(TripErrorCode.TRIP_NOT_FOUND, "Trip tidak ditemukan");
  }
  const { session } = actorFromRequest(request);
  return jsonResult({ success: true, data: tripDetail(tripId, session) }, 200);
}

export async function handleListCommentsRequest(request: Request, tripId: string) {
  void request;
  if (!knownTrip(tripId)) {
    return fail(TripErrorCode.TRIP_NOT_FOUND, "Trip tidak ditemukan");
  }
  const mock = mockListComments("success", tripId);
  return jsonResult(mock, 200);
}

export async function handleCreateCommentRequest(request: Request, tripId: string) {
  if (!knownTrip(tripId)) {
    return fail(TripErrorCode.TRIP_NOT_FOUND, "Trip tidak ditemukan");
  }
  const { session } = actorFromRequest(request);
  if (!session) return fail("UNAUTHORIZED", "Masuk dulu untuk berkomentar");
  if (!session.emailVerified) {
    return fail(AuthErrorCode.EMAIL_UNVERIFIED, "Verifikasi email dulu untuk berkomentar");
  }
  const parsed = createCommentBodySchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  const mock = mockCreateComment({
    tripId,
    body: parsed.data.body,
    parentId: parsed.data.parentId ?? null,
  });
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 201);
}

export async function handleRequestJoinRequest(request: Request, tripId: string) {
  if (!knownTrip(tripId)) {
    return fail(TripErrorCode.TRIP_NOT_FOUND, "Trip tidak ditemukan");
  }
  const { session } = actorFromRequest(request);
  if (!session) return fail("UNAUTHORIZED", "Masuk dulu untuk mengajukan join");
  if (!session.emailVerified) {
    return fail(AuthErrorCode.EMAIL_UNVERIFIED, "Verifikasi email dulu");
  }
  if (!session.profileComplete) {
    return fail(AuthErrorCode.PROFILE_INCOMPLETE, "Lengkapi profil dulu");
  }
  if (viewerRole(tripId, session) === "host") {
    return fail(AuthErrorCode.FORBIDDEN, "Host tidak mengajukan join ke trip sendiri");
  }
  if (isBlockedEitherWay(session.user.id, tripHost(tripId).id)) {
    return fail("BLOCKED_RELATION", "Tidak bisa join trip pengguna yang diblokir");
  }
  const parsed = joinRequestBodySchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  const mock = mockRequestJoin("success", {
    tripId,
    applicantId: session.user.id,
    message: parsed.data.message ?? null,
  });
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 201);
}

export async function handleListJoinRequestsRequest(request: Request, tripId: string) {
  if (!knownTrip(tripId)) {
    return fail(TripErrorCode.TRIP_NOT_FOUND, "Trip tidak ditemukan");
  }
  const { session } = actorFromRequest(request);
  if (!session) return fail("UNAUTHORIZED", "Tidak sah");
  if (viewerRole(tripId, session) !== "host") {
    return fail(AuthErrorCode.NOT_HOST, "Hanya host yang melihat antrean join");
  }
  const rows = socialStore().joins.filter((row) => row.tripId === tripId);
  return jsonResult({ success: true, data: rows }, 200);
}

export async function handleReviewJoinRequest(request: Request, requestId: string) {
  const { session } = actorFromRequest(request);
  if (!session) return fail("UNAUTHORIZED", "Tidak sah");
  const parsed = joinReviewBodySchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  const existing = socialStore().joins.find((row) => row.id === requestId);
  if (!existing) return fail("NOT_FOUND", "Pengajuan tidak ditemukan");
  if (viewerRole(existing.tripId, session) !== "host") {
    return fail(AuthErrorCode.NOT_HOST, "Hanya host yang memutuskan pengajuan");
  }
  const mock = mockReviewJoin(requestId, parsed.data.decision);
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleWithdrawJoinRequest(request: Request, requestId: string) {
  const { session } = actorFromRequest(request);
  if (!session) return fail("UNAUTHORIZED", "Tidak sah");
  const mock = mockWithdrawJoin(requestId, session.user.id);
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleListMessagesRequest(request: Request, tripId: string) {
  if (!knownTrip(tripId)) {
    return fail(TripErrorCode.TRIP_NOT_FOUND, "Trip tidak ditemukan");
  }
  const { session } = actorFromRequest(request);
  const simulate = new URL(request.url).searchParams.get("simulate");
  const scenario = simulate === "disconnect" ? "providerError" : "success";
  const mock = mockListMessages(scenario, chatActor(tripId, session), tripId);
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleSendMessageRequest(request: Request, tripId: string) {
  if (!knownTrip(tripId)) {
    return fail(TripErrorCode.TRIP_NOT_FOUND, "Trip tidak ditemukan");
  }
  const { session } = actorFromRequest(request);
  const actor = chatActor(tripId, session);
  if (actor === "guest" || actor === "pending") {
    return fail(AuthErrorCode.NOT_MEMBER, "Pending tidak dapat mengirim chat");
  }
  if (!session) return fail("UNAUTHORIZED", "Tidak sah");
  const parsed = sendMessageSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  const mock = mockSendMessage({
    tripId,
    body: parsed.data.body,
    clientMessageId: parsed.data.clientMessageId,
    sender: session.user,
  });
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 201);
}

export async function handleListNotificationsRequest(request: Request) {
  const { session } = actorFromRequest(request);
  if (!session) return fail("UNAUTHORIZED", "Tidak sah");
  return jsonResult(mockListNotifications(session.user.id), 200);
}

export async function handleMarkNotificationReadRequest(request: Request, id: string) {
  const { session } = actorFromRequest(request);
  if (!session) return fail("UNAUTHORIZED", "Tidak sah");
  const mock = mockMarkNotificationRead(session.user.id, id);
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

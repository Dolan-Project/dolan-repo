import { jsonResult, statusForCode } from "@/lib/auth/api-response";
import { isChosenItineraryPath } from "@/lib/offline/itinerary-path";
import { readSessionId } from "@/lib/auth/session-cookie";
import { createApiError } from "@/mocks/scenarios";
import {
  actorFromSessionId,
  bothAttendanceConfirmed,
  clearOfflineForSessionId,
  communityStore,
  completedTogether,
  isBlockedEitherWay,
  nextId,
  publicUserListItem,
  refreshFollowCounts,
  refreshRating,
  userById,
  userByUsername,
} from "@/mocks/community-store";

function fail(code: string, message: string, status = statusForCode(code)) {
  return jsonResult(createApiError(code, message), status);
}

function actorOf(request: Request) {
  return actorFromSessionId(readSessionId(request.headers.get("cookie")));
}

function requireActor(request: Request) {
  const actor = actorOf(request);
  if (!actor) return { actor: null, error: fail("UNAUTHORIZED", "Masuk untuk lanjut") };
  return { actor, error: null };
}

function requireTarget(username: string) {
  const target = userByUsername(username);
  if (!target) return { target: null, error: fail("NOT_FOUND", "Pengguna tidak ditemukan") };
  return { target, error: null };
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function handleFollowRequest(request: Request, username: string) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  const found = requireTarget(username);
  if (!found.target) return found.error;
  const target = found.target;

  if (actor.user.id === target.id) {
    return fail("SELF_FOLLOW", "Tidak bisa follow diri sendiri");
  }
  if (!actor.emailVerified) {
    return fail("EMAIL_UNVERIFIED", "Verifikasi email dulu untuk follow");
  }
  if (isBlockedEitherWay(actor.user.id, target.id)) {
    return fail("BLOCKED_RELATION", "Relasi diblokir");
  }
  const store = communityStore();
  if (store.follows.some((row) => row.followerId === actor.user.id && row.followingId === target.id)) {
    return fail("ALREADY_FOLLOWING", "Sudah mengikuti pengguna ini");
  }
  store.follows.push({ followerId: actor.user.id, followingId: target.id });
  refreshFollowCounts();
  return jsonResult({ success: true, data: { following: true } }, 201);
}

export async function handleUnfollowRequest(request: Request, username: string) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  const found = requireTarget(username);
  if (!found.target) return found.error;
  const store = communityStore();
  store.follows = store.follows.filter(
    (row) => !(row.followerId === actor.user.id && row.followingId === found.target.id),
  );
  refreshFollowCounts();
  return jsonResult({ success: true, data: { following: false } }, 200);
}

export async function handleGetFollowersRequest(request: Request, username: string) {
  void request;
  const found = requireTarget(username);
  if (!found.target) return found.error;
  const store = communityStore();
  const items = store.follows
    .filter((row) => row.followingId === found.target.id)
    .map((row) => userById(row.followerId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map(publicUserListItem);
  return jsonResult({ success: true, data: { items } }, 200);
}

export async function handleGetFollowingRequest(request: Request, username: string) {
  void request;
  const found = requireTarget(username);
  if (!found.target) return found.error;
  const store = communityStore();
  const items = store.follows
    .filter((row) => row.followerId === found.target.id)
    .map((row) => userById(row.followingId))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map(publicUserListItem);
  return jsonResult({ success: true, data: { items } }, 200);
}

export async function handleBlockRequest(request: Request, username: string) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  const found = requireTarget(username);
  if (!found.target) return found.error;
  const target = found.target;
  if (actor.user.id === target.id) {
    return fail("SELF_BLOCK", "Tidak bisa memblokir diri sendiri");
  }
  const store = communityStore();
  if (!store.blocks.some((row) => row.blockerId === actor.user.id && row.blockedId === target.id)) {
    store.blocks.push({ blockerId: actor.user.id, blockedId: target.id });
  }
  store.follows = store.follows.filter(
    (row) =>
      !((row.followerId === actor.user.id && row.followingId === target.id) ||
        (row.followerId === target.id && row.followingId === actor.user.id)),
  );
  refreshFollowCounts();
  return jsonResult({ success: true, data: { blocked: true } }, 200);
}

export async function handleUnblockRequest(request: Request, username: string) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  const found = requireTarget(username);
  if (!found.target) return found.error;
  const store = communityStore();
  store.blocks = store.blocks.filter(
    (row) => !(row.blockerId === actor.user.id && row.blockedId === found.target.id),
  );
  return jsonResult({ success: true, data: { blocked: false } }, 200);
}

export async function handleAttemptJoinRequest(request: Request, tripId: string) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  const trip = communityStore().trips.find((row) => row.id === tripId);
  if (!trip) return fail("NOT_FOUND", "Trip tidak ditemukan");
  if (isBlockedEitherWay(actor.user.id, trip.hostId)) {
    return fail("BLOCKED_RELATION", "Tidak bisa join trip pengguna yang diblokir");
  }
  return jsonResult({ success: true, data: { allowed: true } }, 200);
}

export async function handleCreateReviewRequest(request: Request, username: string) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  const found = requireTarget(username);
  if (!found.target) return found.error;
  const target = found.target;
  if (actor.user.id === target.id) {
    return fail("SELF_REVIEW", "Tidak bisa mereview diri sendiri");
  }
  const body = await readBody(request);
  const tripId = String(body.tripId ?? "");
  const communication = Number(body.communication);
  const attitude = Number(body.attitude);
  if (!tripId || communication < 1 || communication > 5 || attitude < 1 || attitude > 5) {
    return fail("VALIDATION_ERROR", "Rating harus 1–5 dan trip wajib diisi");
  }
  if (!completedTogether(tripId, actor.user.id, target.id)) {
    return fail("NOT_ELIGIBLE", "Review hanya untuk peserta trip yang sudah selesai");
  }
  if (!bothAttendanceConfirmed(tripId, actor.user.id, target.id)) {
    return fail("NOT_ELIGIBLE", "Review dibuka setelah kedua pihak konfirmasi kehadiran");
  }
  const store = communityStore();
  if (
    store.reviews.some(
      (row) => row.tripId === tripId && row.reviewerId === actor.user.id && row.revieweeId === target.id,
    )
  ) {
    return fail("DUPLICATE_REVIEW", "Ulasan untuk trip ini sudah ada");
  }
  const comment = String(body.comment ?? "").trim();
  const row = {
    id: nextId("review"),
    reviewerId: actor.user.id,
    revieweeId: target.id,
    tripId,
    communication,
    attitude,
    comment: comment || null,
    moderationStatus: "VISIBLE" as const,
  };
  store.reviews.push(row);
  refreshRating(target.id);
  return jsonResult({ success: true, data: row }, 201);
}

export async function handleGetReviewsRequest(request: Request, username: string) {
  void request;
  const found = requireTarget(username);
  if (!found.target) return found.error;
  const items = communityStore()
    .reviews.filter((row) => row.revieweeId === found.target.id && row.moderationStatus === "VISIBLE")
    .map((row) => ({
      ...row,
      reviewer: publicUserListItem(userById(row.reviewerId)!),
    }));
  return jsonResult({ success: true, data: { items, rating: found.target.rating } }, 200);
}

export async function handleGetHistoryRequest(request: Request, username: string) {
  const found = requireTarget(username);
  if (!found.target) return found.error;
  const actor = actorOf(request);
  const isOwner = actor?.user.id === found.target.id;
  if (!isOwner && !found.target.showPublicHistory) {
    return jsonResult({ success: true, data: { items: [] } }, 200);
  }
  const items = communityStore()
    .history.filter(
      (row) =>
        row.userId === found.target.id && (isOwner || row.visibility === "PUBLIC"),
    )
    .map((row) => ({ title: row.title, visibility: row.visibility }));
  return jsonResult({ success: true, data: { items } }, 200);
}

export async function handleConfirmAttendanceRequest(request: Request, tripId: string) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  const trip = communityStore().trips.find((row) => row.id === tripId);
  if (!trip || trip.status !== "COMPLETED") {
    return fail("NOT_ELIGIBLE", "Konfirmasi kehadiran hanya untuk trip selesai");
  }
  if (!completedTogether(tripId, actor.user.id, trip.hostId) && actor.user.id !== trip.hostId) {
    return fail("NOT_ELIGIBLE", "Hanya peserta trip yang dapat konfirmasi kehadiran");
  }
  const body = await readBody(request);
  const confirmed = body.confirmed !== false;
  const store = communityStore();
  const existing = store.attendance.find((row) => row.tripId === tripId && row.userId === actor.user.id);
  if (existing) existing.confirmed = confirmed;
  else store.attendance.push({ tripId, userId: actor.user.id, confirmed });
  return jsonResult({ success: true, data: { tripId, confirmed } }, 200);
}

export async function handleCreateReportRequest(request: Request) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  const body = await readBody(request);
  const targetType = body.targetType;
  const targetId = String(body.targetId ?? "");
  const reason = String(body.reason ?? "").trim();
  if (
    targetType !== "user" &&
    targetType !== "trip" &&
    targetType !== "comment" &&
    targetType !== "message" &&
    targetType !== "review"
  ) {
    return fail("VALIDATION_ERROR", "Target laporan tidak valid");
  }
  if (!targetId || !reason) {
    return fail("VALIDATION_ERROR", "Alasan dan target wajib diisi");
  }
  const row = {
    id: nextId("report"),
    reporterId: actor.user.id,
    targetType: targetType as "user" | "trip" | "comment" | "message" | "review",
    targetId,
    reason,
    status: "OPEN" as const,
  };
  communityStore().reports.push(row);
  return jsonResult({ success: true, data: row }, 201);
}

export async function handleListReportsRequest(request: Request) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  if (!actor.isAdmin) return fail("FORBIDDEN", "Hanya admin yang dapat melihat laporan");
  return jsonResult({ success: true, data: { items: communityStore().reports } }, 200);
}

export async function handleModerateReportRequest(request: Request, reportId: string) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  if (!actor.isAdmin) return fail("FORBIDDEN", "Hanya admin yang dapat meninjau laporan");
  const report = communityStore().reports.find((row) => row.id === reportId);
  if (!report) return fail("NOT_FOUND", "Laporan tidak ditemukan");
  const body = await readBody(request);
  const action = String(body.action ?? "");
  if (action === "hide") {
    report.status = "HIDDEN";
    if (report.targetType === "review") {
      const review = communityStore().reviews.find((row) => row.id === report.targetId);
      if (review) {
        review.moderationStatus = "HIDDEN";
        refreshRating(review.revieweeId);
      }
    }
  } else if (action === "dismiss") report.status = "DISMISSED";
  else return fail("VALIDATION_ERROR", "Aksi moderasi tidak valid");
  return jsonResult({ success: true, data: report }, 200);
}

export async function handleSaveOfflineItineraryRequest(request: Request) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  const body = await readBody(request);
  const id = String(body.id ?? "");
  const title = String(body.title ?? "");
  const path = String(body.path ?? "");
  if (!id || !title || !isChosenItineraryPath(path)) {
    return fail("NOT_ELIGIBLE", "Offline hanya untuk itinerary yang dipilih");
  }
  const store = communityStore();
  store.offline = store.offline.filter((row) => !(row.ownerUserId === actor.user.id && row.id === id));
  const row = { id, title, path, ownerUserId: actor.user.id };
  store.offline.push(row);
  return jsonResult({ success: true, data: row }, 201);
}

export async function handleListOfflineItinerariesRequest(request: Request) {
  const { actor, error } = requireActor(request);
  if (!actor) return error;
  const items = communityStore().offline.filter((row) => row.ownerUserId === actor.user.id);
  return jsonResult({ success: true, data: { items } }, 200);
}

export { clearOfflineForSessionId };

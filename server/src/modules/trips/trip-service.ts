import { createHash } from "node:crypto";
import {
  AuthErrorCode,
  TripErrorCode,
  apiPage,
  idempotencyKeySchema,
  type AuthIdentity,
  type CreateCommentBody,
  type CreateTripBody,
  type JoinRequest,
  type JoinReviewDecision,
  type MyTripRole,
  type MyTripSummary,
  type PublishTripBody,
  type SessionActor,
  type TripAccessContext,
  type TripComment,
  type TripDetail,
  type TripStatus,
  type TripViewerRole,
  type UpdateTripBody,
  type VisibilityBody,
} from "@dolan/shared";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthorized,
} from "../../lib/api-error.ts";
import { placeholderUser, toPublicUser } from "./public-user.ts";
import type { StoredComment, StoredJoin, StoredTrip, TripAccess, TripStore } from "./types.ts";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export type TripRealtime = {
  evictFromRoom?(tripId: string, userId: string): Promise<unknown> | unknown;
  onPublished?(tripId: string, hostUserId: string): Promise<unknown> | unknown;
  onJoinRequested?(tripId: string, userId: string): Promise<unknown> | unknown;
  onMemberJoined?(tripId: string, userId: string): Promise<unknown> | unknown;
  onJoinClosed?(tripId: string, userId: string): Promise<unknown> | unknown;
  onCancelled?(tripId: string): Promise<unknown> | unknown;
};

export class TripService {
  constructor(
    private readonly store: TripStore,
    private readonly realtime?: TripRealtime,
  ) {}

  async createDraft(actor: SessionActor, body: CreateTripBody, idempotencyKey: string | undefined) {
    const user = requireUser(actor);
    return this.idempotent(user.id, "trips.create", idempotencyKey, { body }, async () => {
      await this.store.upsertUser(user);
      const trip = await this.store.createTrip({
        hostUserId: user.id,
        title: body.title,
        description: body.description ?? null,
        visibility: body.visibility,
        status: "DRAFT",
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
        timezone: body.timezone,
        privateOriginLabel: body.originLabel ?? null,
        privateOriginLatitude: body.originLatitude ?? null,
        privateOriginLongitude: body.originLongitude ?? null,
        destinationCity: body.destinationCity ?? null,
        publicMeetingPointLabel: body.publicMeetingPointLabel ?? null,
        publicMeetingPointLatitude: body.publicMeetingPointLatitude ?? null,
        publicMeetingPointLongitude: body.publicMeetingPointLongitude ?? null,
        transportMode: body.transportMode ?? null,
        budgetAmount: body.budgetAmount ?? null,
        budgetBasis: body.budgetBasis ?? "PER_PERSON",
        currency: "IDR",
        planningPartySize: body.planningPartySize,
        maxParticipants: body.maxParticipants ?? null,
        genderRule: body.genderRule,
        communityRules: body.communityRules ?? null,
        currentItineraryVersionId: null,
        preferences: body.preferences ?? null,
      });
      await this.store.ensureHostMembership(trip.id, user.id);
      return this.toDetail(trip, user);
    });
  }

  async listMine(actor: SessionActor, role: MyTripRole, page: number, limit: number) {
    const user = requireUser(actor);
    const result =
      role === "hosted"
        ? await this.store.listHosted(user.id, page, limit)
        : role === "joined"
          ? await this.store.listJoined(user.id, page, limit)
          : await this.store.listPending(user.id, page, limit);
    const items: MyTripSummary[] = [];
    for (const trip of result.items) {
      items.push(await this.toSummary(trip));
    }
    return apiPage(items, page, limit, result.total);
  }

  async getTrip(actor: SessionActor, tripId: string) {
    const trip = await this.requireVisibleTrip(actor, tripId);
    return this.toDetail(trip, actorUser(actor));
  }

  async updateTrip(actor: SessionActor, tripId: string, body: UpdateTripBody) {
    const trip = await this.requireHostTrip(actor, tripId);
    if (trip.status === "CANCELLED" || trip.status === "COMPLETED") {
      throw badRequest(TripErrorCode.INVALID_TRANSITION, "This trip can no longer be edited");
    }
    if (body.maxParticipants != null) {
      const active = await this.activeCount(tripId);
      if (body.maxParticipants < active) {
        throw badRequest(TripErrorCode.INVALID_TRANSITION, "Capacity cannot drop below active members", {
          maxParticipants: "Must be at least the current member count",
        });
      }
    }
    const updated = await this.store.updateTrip(tripId, {
      title: body.title ?? trip.title,
      description: body.description === undefined ? trip.description : body.description,
      startDate: body.startDate === undefined ? trip.startDate : body.startDate,
      endDate: body.endDate === undefined ? trip.endDate : body.endDate,
      timezone: body.timezone ?? trip.timezone,
      privateOriginLabel: body.originLabel === undefined ? trip.privateOriginLabel : body.originLabel,
      privateOriginLatitude: body.originLatitude === undefined ? trip.privateOriginLatitude : body.originLatitude,
      privateOriginLongitude: body.originLongitude === undefined ? trip.privateOriginLongitude : body.originLongitude,
      destinationCity: body.destinationCity === undefined ? trip.destinationCity : body.destinationCity,
      transportMode: body.transportMode === undefined ? trip.transportMode : body.transportMode,
      planningPartySize: body.planningPartySize ?? trip.planningPartySize,
      budgetAmount: body.budgetAmount === undefined ? trip.budgetAmount : body.budgetAmount,
      budgetBasis: body.budgetBasis ?? trip.budgetBasis,
      maxParticipants: body.maxParticipants === undefined ? trip.maxParticipants : body.maxParticipants,
      genderRule: body.genderRule ?? trip.genderRule ?? "ALL_GENDERS",
      communityRules: body.communityRules === undefined ? trip.communityRules : body.communityRules,
      publicMeetingPointLabel:
        body.publicMeetingPointLabel === undefined ? trip.publicMeetingPointLabel : body.publicMeetingPointLabel,
      publicMeetingPointLatitude:
        body.publicMeetingPointLatitude === undefined
          ? trip.publicMeetingPointLatitude
          : body.publicMeetingPointLatitude,
      publicMeetingPointLongitude:
        body.publicMeetingPointLongitude === undefined
          ? trip.publicMeetingPointLongitude
          : body.publicMeetingPointLongitude,
      preferences: body.preferences === undefined ? trip.preferences : body.preferences,
    });
    if (trip.status !== "DRAFT") {
      await this.notifyMembers(updated, requireUser(actor), "trip.updated");
    }
    return this.toDetail(updated, requireUser(actor));
  }

  async deleteDraft(actor: SessionActor, tripId: string) {
    const trip = await this.requireHostTrip(actor, tripId);
    if (trip.status !== "DRAFT") {
      throw badRequest(TripErrorCode.INVALID_TRANSITION, "Only drafts can be deleted");
    }
    await this.store.withTripLock(tripId, async () => {
      await this.store.deleteTrip(tripId);
    });
    return { deleted: true as const };
  }

  async publish(actor: SessionActor, tripId: string, body: PublishTripBody, idempotencyKey: string | undefined) {
    const user = requireUser(actor);
    return this.idempotent(user.id, "trips.publish", idempotencyKey, { tripId, body }, async () => {
      return this.store.withTripLock(tripId, async (locked) => {
        await this.assertHost(locked, user);
        if (locked.status !== "DRAFT") {
          throw badRequest(TripErrorCode.INVALID_TRANSITION, "Only a draft can be published");
        }
        const visibility = body.visibility ?? locked.visibility;
        const maxParticipants = body.maxParticipants ?? locked.maxParticipants;
        const meetingLabel = body.publicMeetingPointLabel ?? locked.publicMeetingPointLabel;
        const destinationCity = body.destinationCity ?? locked.destinationCity;
        if (visibility === "PUBLIC") {
          this.assertPublicPublishable(maxParticipants, meetingLabel, destinationCity);
        }
        const status: TripStatus = visibility === "PUBLIC" ? "OPEN" : "CLOSED";
        const updated = await this.store.updateTrip(tripId, {
          visibility,
          status,
          destinationCity: destinationCity ?? locked.destinationCity,
          maxParticipants: maxParticipants ?? locked.maxParticipants,
          publicMeetingPointLabel: meetingLabel ?? locked.publicMeetingPointLabel,
          publicMeetingPointLatitude: body.publicMeetingPointLatitude ?? locked.publicMeetingPointLatitude,
          publicMeetingPointLongitude: body.publicMeetingPointLongitude ?? locked.publicMeetingPointLongitude,
        });
        await this.store.ensureHostMembership(tripId, user.id);
        await this.store.ensureChatRoom(tripId);
        const detail = await this.toDetail(updated, user);
        await this.realtime?.onPublished?.(tripId, user.id);
        return detail;
      });
    });
  }

  async close(actor: SessionActor, tripId: string) {
    return this.transition(actor, tripId, "CLOSED", ["OPEN"]);
  }

  async reopen(actor: SessionActor, tripId: string) {
    const trip = await this.requireHostTrip(actor, tripId);
    if (trip.visibility !== "PUBLIC") {
      throw badRequest(TripErrorCode.INVALID_TRANSITION, "Only public trips can reopen for join requests");
    }
    return this.transition(actor, tripId, "OPEN", ["CLOSED"]);
  }

  async start(actor: SessionActor, tripId: string) {
    return this.transition(actor, tripId, "ONGOING", ["OPEN", "CLOSED"]);
  }

  async complete(actor: SessionActor, tripId: string) {
    return this.transition(actor, tripId, "COMPLETED", ["ONGOING"]);
  }

  async cancel(actor: SessionActor, tripId: string) {
    const detail = await this.transition(actor, tripId, "CANCELLED", ["DRAFT", "OPEN", "CLOSED", "ONGOING"]);
    await this.store.setChatReadOnly(tripId, new Date());
    await this.realtime?.onCancelled?.(tripId);
    return detail;
  }

  async changeVisibility(actor: SessionActor, tripId: string, body: VisibilityBody) {
    const user = requireUser(actor);
    return this.store.withTripLock(tripId, async (trip) => {
      await this.assertHost(trip, user);
      if (trip.status === "CANCELLED" || trip.status === "COMPLETED" || trip.status === "DRAFT") {
        throw badRequest(TripErrorCode.INVALID_TRANSITION, "Visibility cannot change in this status");
      }
      if (trip.visibility === body.visibility) {
        return this.toDetail(trip, user);
      }
      if (body.visibility === "PRIVATE") {
        const members = await this.store.listMembers(tripId);
        const hasOtherActive = members.some(
          (member) => member.membershipStatus === "ACTIVE" && member.role !== "HOST",
        );
        const joins = await this.store.listJoins(tripId);
        const hasPending = joins.some((row) => row.status === "PENDING");
        if (hasOtherActive || hasPending) {
          throw badRequest(
            TripErrorCode.INVALID_TRANSITION,
            "Public trips with participants or pending requests cannot become private",
          );
        }
        const updated = await this.store.updateTrip(tripId, { visibility: "PRIVATE", status: "CLOSED" });
        await this.notifyMembers(updated, user, "trip.updated");
        return this.toDetail(updated, user);
      }
      const maxParticipants = body.maxParticipants ?? trip.maxParticipants;
      const meetingLabel = body.publicMeetingPointLabel ?? trip.publicMeetingPointLabel;
      const destinationCity = body.destinationCity ?? trip.destinationCity;
      this.assertPublicPublishable(maxParticipants, meetingLabel, destinationCity);
      const updated = await this.store.updateTrip(tripId, {
        visibility: "PUBLIC",
        status: trip.status === "CLOSED" ? "OPEN" : trip.status,
        destinationCity,
        maxParticipants,
        publicMeetingPointLabel: meetingLabel,
        publicMeetingPointLatitude: body.publicMeetingPointLatitude ?? trip.publicMeetingPointLatitude,
        publicMeetingPointLongitude: body.publicMeetingPointLongitude ?? trip.publicMeetingPointLongitude,
      });
      await this.notifyMembers(updated, user, "trip.updated");
      return this.toDetail(updated, user);
    });
  }

  async requestJoin(actor: SessionActor, tripId: string, message: string | undefined, idempotencyKey: string | undefined) {
    const user = requireUser(actor);
    return this.idempotent(user.id, "trips.join", idempotencyKey, { tripId, message }, async () => {
      return this.store.withTripLock(tripId, async (trip) => {
        await this.store.upsertUser(user);
        if (trip.hostUserId === user.id) {
          throw forbidden(AuthErrorCode.FORBIDDEN, "Host cannot join their own trip");
        }
        if (trip.visibility !== "PUBLIC") throw hiddenTrip();
        if (trip.status !== "OPEN") {
          throw badRequest(TripErrorCode.INVALID_TRANSITION, "This trip is not accepting join requests");
        }
        if (await this.store.isBlocked(user.id, trip.hostUserId)) {
          throw forbidden(TripErrorCode.BLOCKED_RELATION, "Join is blocked between these users");
        }
        const members = await this.store.listMembers(tripId);
        if (members.some((member) => member.userId === user.id && member.membershipStatus === "ACTIVE")) {
          throw conflict(TripErrorCode.DUPLICATE_REQUEST, "You already belong to this trip");
        }
        const existing = await this.store.getJoinByTripUser(tripId, user.id);
        if (existing?.status === "PENDING") {
          throw conflict(TripErrorCode.DUPLICATE_REQUEST, "A join request is already pending");
        }
        if (existing?.status === "ACCEPTED" || existing?.status === "REJECTED") {
          throw conflict(TripErrorCode.DUPLICATE_REQUEST, "Join cannot be requested again on this trip");
        }
        const active = members.filter((member) => member.membershipStatus === "ACTIVE").length;
        if (trip.maxParticipants != null && active >= trip.maxParticipants) {
          throw conflict(TripErrorCode.TRIP_FULL, "This trip is full");
        }
        const join =
          existing?.status === "WITHDRAWN"
            ? await this.store.updateJoin(existing.id, {
                status: "PENDING",
                message: message ?? existing.message,
                reviewedByUserId: null,
                reviewedAt: null,
              })
            : await this.store.createJoin({
                tripId,
                userId: user.id,
                message: message ?? null,
                status: "PENDING",
                reviewedByUserId: null,
                reviewedAt: null,
              });
        await this.store.createNotification({
          recipientUserId: trip.hostUserId,
          actorUserId: user.id,
          type: "join_request.created",
          targetType: "trip",
          targetId: tripId,
        });
        const created = await this.toJoin(join);
        await this.realtime?.onJoinRequested?.(tripId, user.id);
        return created;
      });
    });
  }

  async listJoinRequests(actor: SessionActor, tripId: string, page: number, limit: number) {
    await this.requireHostTrip(actor, tripId);
    const rows = (await this.store.listJoins(tripId)).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const start = (page - 1) * limit;
    const items: JoinRequest[] = [];
    for (const row of rows.slice(start, start + limit)) items.push(await this.toJoin(row));
    return apiPage(items, page, limit, rows.length);
  }

  async reviewJoin(actor: SessionActor, requestId: string, decision: JoinReviewDecision, idempotencyKey: string | undefined) {
    const user = requireUser(actor);
    return this.idempotent(user.id, "trips.join.review", idempotencyKey, { requestId, decision }, async () => {
      const request = await this.store.getJoinRequest(requestId);
      if (!request) throw hiddenTrip();
      return this.store.withTripLock(request.tripId, async (trip) => {
        await this.assertHost(trip, user);
        const locked = await this.store.getJoinRequest(requestId);
        if (!locked || locked.status !== "PENDING") {
          throw badRequest(TripErrorCode.INVALID_TRANSITION, "Only pending requests can be reviewed");
        }
        if (trip.status === "CANCELLED" || trip.status === "COMPLETED") {
          throw badRequest(TripErrorCode.INVALID_TRANSITION, "This trip is not accepting reviews");
        }
        if (decision === "accept") {
          if (trip.status === "CLOSED" || trip.status === "DRAFT" || trip.visibility !== "PUBLIC") {
            throw badRequest(TripErrorCode.INVALID_TRANSITION, "This trip is not accepting new participants");
          }
          const active = await this.activeCount(trip.id);
          if (trip.maxParticipants != null && active >= trip.maxParticipants) {
            throw conflict(TripErrorCode.TRIP_FULL, "This trip is full");
          }
          await this.store.addParticipant(trip.id, locked.userId);
        }
        const updated = await this.store.updateJoin(locked.id, {
          status: decision === "accept" ? "ACCEPTED" : "REJECTED",
          reviewedByUserId: user.id,
          reviewedAt: new Date().toISOString(),
        });
        await this.store.createNotification({
          recipientUserId: locked.userId,
          actorUserId: user.id,
          type: "join_request.reviewed",
          targetType: "join_request",
          targetId: locked.id,
          data: { decision },
        });
        const reviewed = await this.toJoin(updated);
        if (decision === "accept") await this.realtime?.onMemberJoined?.(trip.id, locked.userId);
        else await this.realtime?.onJoinClosed?.(trip.id, locked.userId);
        return reviewed;
      });
    });
  }

  async withdrawJoin(actor: SessionActor, requestId: string) {
    const user = requireUser(actor);
    const request = await this.store.getJoinRequest(requestId);
    if (!request) throw hiddenTrip();
    if (request.userId !== user.id) {
      const trip = await this.store.getTrip(request.tripId);
      if (trip && (await this.actorKnowsTrip(trip, user.id))) {
        throw forbidden(AuthErrorCode.FORBIDDEN, "You cannot withdraw this join request");
      }
      throw hiddenTrip();
    }
    if (request.status !== "PENDING") {
      throw badRequest(TripErrorCode.INVALID_TRANSITION, "Only a pending request can be withdrawn");
    }
    const updated = await this.store.updateJoin(request.id, { status: "WITHDRAWN" });
    const withdrawn = await this.toJoin(updated);
    await this.realtime?.onJoinClosed?.(request.tripId, user.id);
    return withdrawn;
  }

  async listComments(actor: SessionActor, tripId: string, page: number, limit: number) {
    const trip = await this.requireVisibleTrip(actor, tripId);
    if (trip.visibility !== "PUBLIC") {
      throw forbidden(TripErrorCode.TRIP_NOT_PUBLIC, "Comments are only available on public trips");
    }
    const result = await this.store.listComments(tripId, page, limit);
    const items: TripComment[] = [];
    for (const row of result.items) items.push(await this.toComment(row));
    return apiPage(items, page, limit, result.total);
  }

  async createComment(actor: SessionActor, tripId: string, body: CreateCommentBody, idempotencyKey: string | undefined) {
    const user = requireUser(actor);
    return this.idempotent(user.id, "trips.comment", idempotencyKey, { tripId, body }, async () => {
      const trip = await this.requireVisibleTrip(actor, tripId);
      if (trip.visibility !== "PUBLIC") {
        throw forbidden(TripErrorCode.TRIP_NOT_PUBLIC, "Comments are only available on public trips");
      }
      if (body.parentId) {
        const parent = await this.store.getComment(body.parentId);
        if (!parent || parent.tripId !== tripId || parent.deletedAt) {
          throw badRequest(TripErrorCode.INVALID_PARENT, "Reply parent is invalid");
        }
        if (parent.parentCommentId) {
          throw badRequest(TripErrorCode.INVALID_PARENT, "Replies can only be one level deep");
        }
      }
      await this.store.upsertUser(user);
      const comment = await this.store.createComment({
        tripId,
        userId: user.id,
        parentCommentId: body.parentId ?? null,
        body: body.body,
        deletedAt: null,
      });
      const recipient = body.parentId
        ? (await this.store.getComment(body.parentId))?.userId
        : trip.hostUserId;
      if (recipient) {
        await this.store.createNotification({
          recipientUserId: recipient,
          actorUserId: user.id,
          type: "comment.created",
          targetType: "trip",
          targetId: tripId,
        });
      }
      return this.toComment(comment);
    });
  }

  async updateComment(actor: SessionActor, tripId: string, commentId: string, body: string) {
    const user = requireUser(actor);
    await this.requireVisibleTrip(actor, tripId);
    const comment = await this.store.getComment(commentId);
    if (!comment || comment.tripId !== tripId || comment.deletedAt) throw hiddenTrip();
    if (comment.userId !== user.id) {
      throw forbidden(AuthErrorCode.FORBIDDEN, "Only the author can edit this comment");
    }
    return this.toComment(await this.store.updateComment(commentId, body));
  }

  async deleteComment(actor: SessionActor, tripId: string, commentId: string) {
    const user = requireUser(actor);
    const trip = await this.requireVisibleTrip(actor, tripId);
    const comment = await this.store.getComment(commentId);
    if (!comment || comment.tripId !== tripId || comment.deletedAt) throw hiddenTrip();
    if (comment.userId !== user.id && trip.hostUserId !== user.id) {
      throw forbidden(AuthErrorCode.FORBIDDEN, "Only the author or host can delete this comment");
    }
    await this.store.softDeleteComment(commentId);
    return { deleted: true as const };
  }

  async leaveTrip(actor: SessionActor, tripId: string) {
    const user = requireUser(actor);
    const detail = await this.store.withTripLock(tripId, async (trip) => {
      if (trip.hostUserId === user.id) {
        throw forbidden(AuthErrorCode.FORBIDDEN, "Host cannot leave; cancel the trip instead");
      }
      const left = await this.store.leaveMembership(tripId, user.id);
      if (!left) {
        if (await this.actorKnowsTrip(trip, user.id)) {
          throw forbidden(AuthErrorCode.NOT_MEMBER, "Active membership is required");
        }
        throw hiddenTrip();
      }
      await this.store.revokeTripLocation(user.id, tripId);
      await this.store.createNotification({
        recipientUserId: trip.hostUserId,
        actorUserId: user.id,
        type: "member.left",
        targetType: "trip",
        targetId: tripId,
      });
      return this.toDetail(trip, user);
    });
    await this.realtime?.evictFromRoom?.(tripId, user.id);
    return detail;
  }

  async accessFor(tripId: string, userId: string | null): Promise<TripAccessContext | null> {
    const trip = await this.store.getTrip(tripId);
    if (!trip) return null;
    if (!userId) {
      return { tripId, memberRole: null, membershipStatus: null, joinRequestStatus: null };
    }
    const access = await this.loadAccess(trip, userId);
    return {
      tripId,
      memberRole: access.memberRole,
      membershipStatus: access.membershipStatus,
      joinRequestStatus: access.joinRequestStatus,
    };
  }

  async accessForJoinRequest(requestId: string, userId: string): Promise<TripAccessContext | null> {
    const request = await this.store.getJoinRequest(requestId);
    if (!request) return null;
    return this.accessFor(request.tripId, userId);
  }

  private async transition(actor: SessionActor, tripId: string, next: TripStatus, from: TripStatus[]) {
    const user = requireUser(actor);
    return this.store.withTripLock(tripId, async (trip) => {
      await this.assertHost(trip, user);
      if (!from.includes(trip.status)) {
        throw badRequest(TripErrorCode.INVALID_TRANSITION, `Cannot move from ${trip.status} to ${next}`);
      }
      const updated = await this.store.updateTrip(tripId, { status: next });
      await this.notifyMembers(updated, user, "trip.updated");
      return this.toDetail(updated, user);
    });
  }

  private async requireTrip(tripId: string) {
    const trip = await this.store.getTrip(tripId);
    if (!trip) throw hiddenTrip();
    return trip;
  }

  private async requireHostTrip(actor: SessionActor, tripId: string) {
    const user = requireUser(actor);
    const trip = await this.requireTrip(tripId);
    await this.assertHost(trip, user);
    return trip;
  }

  private async requireVisibleTrip(actor: SessionActor, tripId: string) {
    const trip = await this.store.getTrip(tripId);
    if (!trip) throw hiddenTrip();
    const user = actorUser(actor);
    if (trip.visibility === "PUBLIC" && trip.status !== "DRAFT") return trip;
    if (user && trip.hostUserId === user.id) return trip;
    if (user) {
      const members = await this.store.listMembers(tripId);
      if (members.some((member) => member.userId === user.id && member.membershipStatus === "ACTIVE")) {
        return trip;
      }
    }
    throw hiddenTrip();
  }

  private async actorKnowsTrip(trip: StoredTrip, userId: string) {
    if (trip.hostUserId === userId) return true;
    if (trip.visibility === "PUBLIC" && trip.status !== "DRAFT") return true;
    const members = await this.store.listMembers(trip.id);
    if (members.some((member) => member.userId === userId && member.membershipStatus === "ACTIVE")) return true;
    const join = await this.store.getJoinByTripUser(trip.id, userId);
    return Boolean(join);
  }

  private async assertHost(trip: StoredTrip, user: AuthIdentity) {
    if (trip.hostUserId === user.id) return;
    if (await this.actorKnowsTrip(trip, user.id)) {
      throw forbidden(AuthErrorCode.NOT_HOST, "Only the host can perform this action");
    }
    throw hiddenTrip();
  }

  private assertPublicPublishable(
    maxParticipants: number | null | undefined,
    meetingLabel: string | null | undefined,
    destinationCity: string | null | undefined,
  ) {
    if (!destinationCity?.trim()) {
      throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Public trips need a destination city", {
        destinationCity: "Required for a public trip",
      });
    }
    if (maxParticipants == null) {
      throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Public trips need a capacity", {
        maxParticipants: "Required for a public trip",
      });
    }
    if (!meetingLabel?.trim()) {
      throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Public trips need a meeting point", {
        publicMeetingPointLabel: "Required for a public trip",
      });
    }
  }

  private async activeCount(tripId: string) {
    const members = await this.store.listMembers(tripId);
    return members.filter((member) => member.membershipStatus === "ACTIVE").length;
  }

  private async loadAccess(trip: StoredTrip, userId: string): Promise<TripAccess> {
    const members = await this.store.listMembers(trip.id);
    const member = members.find((row) => row.userId === userId) ?? null;
    const join = await this.store.getJoinByTripUser(trip.id, userId);
    return {
      trip,
      memberRole: member?.membershipStatus === "ACTIVE" ? member.role : null,
      membershipStatus: member?.membershipStatus ?? null,
      joinRequestStatus: join?.status ?? null,
    };
  }

  private async toDetail(trip: StoredTrip, viewer: AuthIdentity | null): Promise<TripDetail> {
    const host = (await this.store.getUser(trip.hostUserId)) ?? viewer;
    const members = await this.store.listMembers(trip.id);
    const joins = await this.store.listJoins(trip.id);
    const viewerRole = this.viewerRole(trip, viewer, members, joins);
    const myJoin = viewer ? joins.find((row) => row.userId === viewer.id) : undefined;
    const isHost = Boolean(viewer && viewer.id === trip.hostUserId);
    return {
      id: trip.id,
      title: trip.title,
      description: trip.description,
      visibility: trip.visibility,
      status: trip.status,
      startDate: trip.startDate,
      endDate: trip.endDate,
      timezone: trip.timezone,
      destinationCity: trip.destinationCity,
      transportMode: trip.transportMode,
      budgetAmount: trip.budgetAmount,
      budgetBasis: trip.budgetBasis,
      currency: trip.currency,
      planningPartySize: trip.planningPartySize,
      maxParticipants: trip.maxParticipants,
      genderRule: trip.genderRule ?? "ALL_GENDERS",
      communityRules: trip.communityRules ?? null,
      publicMeetingPointLabel: trip.publicMeetingPointLabel,
      publicMeetingPointLatitude: trip.publicMeetingPointLatitude,
      publicMeetingPointLongitude: trip.publicMeetingPointLongitude,
      privateOriginLabel: isHost ? trip.privateOriginLabel : null,
      privateOriginLatitude: isHost ? trip.privateOriginLatitude : null,
      privateOriginLongitude: isHost ? trip.privateOriginLongitude : null,
      preferences: isHost ? trip.preferences : null,
      host: host ? toPublicUser(host) : placeholderUser(trip.hostUserId),
      viewerRole,
      activeParticipantCount: members.filter((member) => member.membershipStatus === "ACTIVE").length,
      pendingRequestCount: joins.filter((row) => row.status === "PENDING").length,
      joinFree: true,
      currentItineraryVersionId: trip.currentItineraryVersionId,
      members: await Promise.all(
        members
          .filter((member) => member.membershipStatus === "ACTIVE")
          .map(async (member) => {
            const user = await this.store.getUser(member.userId);
            return user ? toPublicUser(user) : placeholderUser(member.userId);
          }),
      ),
      myJoinRequest: myJoin ? await this.toJoin(myJoin) : null,
    };
  }

  private async toSummary(trip: StoredTrip): Promise<MyTripSummary> {
    const host = await this.store.getUser(trip.hostUserId);
    const members = await this.store.listMembers(trip.id);
    const joins = await this.store.listJoins(trip.id);
    return {
      id: trip.id,
      title: trip.title,
      destinationCity: trip.destinationCity,
      visibility: trip.visibility,
      status: trip.status,
      startDate: trip.startDate,
      endDate: trip.endDate,
      participantCount: members.filter((member) => member.membershipStatus === "ACTIVE").length,
      pendingRequestCount: joins.filter((row) => row.status === "PENDING").length,
      coverPlace: await this.store.getCoverPlace(trip.id),
      publicMeetingPointLabel: trip.publicMeetingPointLabel,
      publicMeetingPointLatitude: trip.publicMeetingPointLatitude,
      publicMeetingPointLongitude: trip.publicMeetingPointLongitude,
      host: host ? toPublicUser(host) : placeholderUser(trip.hostUserId),
      maxParticipants: trip.maxParticipants,
      genderRule: trip.genderRule ?? "ALL_GENDERS",
    };
  }

  private async toJoin(row: StoredJoin): Promise<JoinRequest> {
    const applicant = await this.store.getUser(row.userId);
    return {
      id: row.id,
      tripId: row.tripId,
      applicant: applicant ? toPublicUser(applicant) : placeholderUser(row.userId),
      message: row.message,
      status: row.status,
    };
  }

  private async toComment(row: StoredComment): Promise<TripComment> {
    const author = await this.store.getUser(row.userId);
    return {
      id: row.id,
      tripId: row.tripId,
      author: author ? toPublicUser(author) : placeholderUser(row.userId),
      parentId: row.parentCommentId,
      body: row.body,
      createdAt: row.createdAt,
    };
  }

  private viewerRole(
    trip: StoredTrip,
    viewer: AuthIdentity | null,
    members: Awaited<ReturnType<TripStore["listMembers"]>>,
    joins: StoredJoin[],
  ): TripViewerRole {
    if (!viewer) return "none";
    if (trip.hostUserId === viewer.id) return "host";
    if (members.some((member) => member.userId === viewer.id && member.membershipStatus === "ACTIVE")) {
      return "participant";
    }
    if (joins.some((row) => row.userId === viewer.id && row.status === "PENDING")) return "pending";
    return "none";
  }

  private async notifyMembers(trip: StoredTrip, actor: AuthIdentity, type: string) {
    const members = await this.store.listMembers(trip.id);
    const recipients = new Set<string>([trip.hostUserId]);
    for (const member of members) {
      if (member.membershipStatus === "ACTIVE") recipients.add(member.userId);
    }
    for (const recipientUserId of recipients) {
      await this.store.createNotification({
        recipientUserId,
        actorUserId: actor.id,
        type,
        targetType: "trip",
        targetId: trip.id,
      });
    }
  }

  private async idempotent<T>(
    actorUserId: string,
    operation: string,
    key: string | undefined,
    payload: unknown,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (!key?.trim()) {
      throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Idempotency-Key is required", {
        idempotencyKey: "Required",
      });
    }
    if (!idempotencyKeySchema.safeParse(key).success) {
      throw badRequest(TripErrorCode.INVALID_PLAN_INPUT, "Idempotency-Key must be a UUID", {
        idempotencyKey: "Must be a UUID",
      });
    }
    const requestHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const existing = await this.store.findIdempotency(actorUserId, operation, key);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw conflict(TripErrorCode.IDEMPOTENCY_CONFLICT, "Idempotency key was reused with a different body");
      }
      return existing.responseBody as T;
    }
    const result = await fn();
    await this.store.saveIdempotency(
      actorUserId,
      operation,
      key,
      requestHash,
      200,
      result,
      new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    );
    return result;
  }
}

function requireUser(actor: SessionActor): AuthIdentity {
  if (actor.kind !== "user") throw unauthorized();
  return actor.user;
}

function actorUser(actor: SessionActor): AuthIdentity | null {
  return actor.kind === "user" ? actor.user : null;
}

function hiddenTrip() {
  return notFound(TripErrorCode.TRIP_NOT_FOUND, "Trip was not found");
}

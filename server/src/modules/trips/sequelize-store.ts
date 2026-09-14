import { AsyncLocalStorage } from "node:async_hooks";
import {
  ChatRoom,
  GenerationJob,
  getSequelize,
  IdempotencyKey,
  ItineraryDay,
  ItineraryStop,
  ItineraryTemplate,
  ItineraryVersion,
  LocationLatest,
  LocationShare,
  Message,
  Notification,
  Place,
  TemplateUsage,
  Trip,
  TripComment,
  TripJoinRequest,
  TripMember,
  User,
  UserBlock,
  UserProfile,
  UserReview,
  initModels,
} from "@dolan/database";
import type { AuthIdentity } from "@dolan/shared";
import { TripErrorCode } from "@dolan/shared";
import { Op, type Transaction } from "sequelize";
import { notFound } from "../../lib/api-error.ts";
import { toAuthIdentity } from "../auth/sequelize-user-repository.ts";
import { coverPlaceFromCache } from "./cover-place.ts";
import type {
  PageResult,
  StoredComment,
  StoredIdempotency,
  StoredJoin,
  StoredMember,
  StoredTrip,
  TripStore,
} from "./types.ts";

const txContext = new AsyncLocalStorage<Transaction>();

export class SequelizeTripStore implements TripStore {
  constructor() {
    initModels();
  }

  private tx() {
    return txContext.getStore();
  }

  async getUser(userId: string) {
    const user = await User.findByPk(userId, { transaction: this.tx() });
    if (!user) return null;
    const profile = await UserProfile.findOne({ where: { userId }, transaction: this.tx() });
    return toAuthIdentity(user, profile);
  }

  async upsertUser(user: AuthIdentity) {
    await User.findOrCreate({
      where: { id: user.id },
      defaults: {
        id: user.id,
        authReference: user.authReference,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
      },
      transaction: this.tx(),
    });
  }

  async getTrip(tripId: string) {
    const trip = await Trip.findByPk(tripId, { transaction: this.tx() });
    return trip ? toStoredTrip(trip) : null;
  }

  async createTrip(input: Omit<StoredTrip, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const trip = await Trip.create(
      {
        id: input.id,
        hostUserId: input.hostUserId,
        title: input.title,
        description: input.description,
        visibility: input.visibility,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        timezone: input.timezone,
        privateOriginLabel: input.privateOriginLabel,
        privateOriginLatitude: input.privateOriginLatitude,
        privateOriginLongitude: input.privateOriginLongitude,
        destinationCity: input.destinationCity,
        publicMeetingPointLabel: input.publicMeetingPointLabel,
        publicMeetingPointLatitude: input.publicMeetingPointLatitude,
        publicMeetingPointLongitude: input.publicMeetingPointLongitude,
        transportMode: input.transportMode,
        budgetAmount: input.budgetAmount,
        budgetBasis: input.budgetBasis,
        currency: input.currency,
        planningPartySize: input.planningPartySize,
        maxParticipants: input.maxParticipants,
        genderRule: input.genderRule ?? "ALL_GENDERS",
        communityRules: input.communityRules ?? null,
        currentItineraryVersionId: input.currentItineraryVersionId,
        preferences: input.preferences,
      },
      { transaction: this.tx() },
    );
    return toStoredTrip(trip);
  }

  async updateTrip(tripId: string, patch: Partial<StoredTrip>) {
    const trip = await Trip.findByPk(tripId, { transaction: this.tx() });
    if (!trip) throw notFound(TripErrorCode.TRIP_NOT_FOUND, "Trip was not found");
    await trip.update(
      {
        title: patch.title ?? trip.title,
        description: patch.description === undefined ? trip.description : patch.description,
        visibility: patch.visibility ?? trip.visibility,
        status: patch.status ?? trip.status,
        startDate: patch.startDate === undefined ? trip.startDate : patch.startDate,
        endDate: patch.endDate === undefined ? trip.endDate : patch.endDate,
        timezone: patch.timezone ?? trip.timezone,
        privateOriginLabel: patch.privateOriginLabel === undefined ? trip.privateOriginLabel : patch.privateOriginLabel,
        privateOriginLatitude:
          patch.privateOriginLatitude === undefined ? trip.privateOriginLatitude : patch.privateOriginLatitude,
        privateOriginLongitude:
          patch.privateOriginLongitude === undefined ? trip.privateOriginLongitude : patch.privateOriginLongitude,
        destinationCity: patch.destinationCity === undefined ? trip.destinationCity : patch.destinationCity,
        publicMeetingPointLabel:
          patch.publicMeetingPointLabel === undefined ? trip.publicMeetingPointLabel : patch.publicMeetingPointLabel,
        publicMeetingPointLatitude:
          patch.publicMeetingPointLatitude === undefined
            ? trip.publicMeetingPointLatitude
            : patch.publicMeetingPointLatitude,
        publicMeetingPointLongitude:
          patch.publicMeetingPointLongitude === undefined
            ? trip.publicMeetingPointLongitude
            : patch.publicMeetingPointLongitude,
        transportMode: patch.transportMode === undefined ? trip.transportMode : patch.transportMode,
        budgetAmount: patch.budgetAmount === undefined ? trip.budgetAmount : patch.budgetAmount,
        budgetBasis: patch.budgetBasis ?? trip.budgetBasis,
        planningPartySize: patch.planningPartySize ?? trip.planningPartySize,
        maxParticipants: patch.maxParticipants === undefined ? trip.maxParticipants : patch.maxParticipants,
        genderRule: patch.genderRule ?? trip.genderRule,
        communityRules: patch.communityRules === undefined ? trip.communityRules : patch.communityRules,
        currentItineraryVersionId:
          patch.currentItineraryVersionId === undefined
            ? trip.currentItineraryVersionId
            : patch.currentItineraryVersionId,
        preferences: patch.preferences === undefined ? trip.preferences : patch.preferences,
      },
      { transaction: this.tx() },
    );
    return toStoredTrip(trip);
  }

  async deleteTrip(tripId: string) {
    const tx = this.tx();
    await GenerationJob.destroy({ where: { tripId }, transaction: tx });
    await Trip.update({ currentItineraryVersionId: null }, { where: { id: tripId }, transaction: tx });
    await ItineraryVersion.destroy({ where: { tripId }, transaction: tx });

    const usages = await TemplateUsage.findAll({ where: { createdTripId: tripId }, transaction: tx });
    for (const usage of usages) {
      await ItineraryTemplate.decrement("usageCount", {
        by: 1,
        where: { id: usage.templateId, usageCount: { [Op.gt]: 0 } },
        transaction: tx,
      });
    }
    await TemplateUsage.destroy({ where: { createdTripId: tripId }, transaction: tx });

    await UserReview.destroy({ where: { tripId }, transaction: tx });
    await TripComment.destroy({ where: { tripId }, transaction: tx });
    await TripJoinRequest.destroy({ where: { tripId }, transaction: tx });
    await TripMember.destroy({ where: { tripId }, transaction: tx });

    const room = await ChatRoom.findOne({ where: { tripId }, transaction: tx });
    if (room) {
      await Message.destroy({ where: { chatRoomId: room.id }, transaction: tx });
      await ChatRoom.destroy({ where: { id: room.id }, transaction: tx });
    }

    await Trip.destroy({ where: { id: tripId }, transaction: tx });
  }

  async listHosted(userId: string, page: number, limit: number) {
    return this.pageTrips({ hostUserId: userId }, page, limit);
  }

  async listJoined(userId: string, page: number, limit: number) {
    const members = await TripMember.findAll({
      where: { userId, role: "PARTICIPANT", membershipStatus: "ACTIVE" },
      transaction: this.tx(),
    });
    return this.pageTrips({ id: members.map((row) => row.tripId) }, page, limit);
  }

  async listPending(userId: string, page: number, limit: number) {
    const joins = await TripJoinRequest.findAll({
      where: { userId, status: "PENDING" },
      transaction: this.tx(),
    });
    return this.pageTrips({ id: joins.map((row) => row.tripId) }, page, limit);
  }

  async getCoverPlace(tripId: string) {
    const trip = await Trip.findByPk(tripId, {
      include: [
        {
          model: ItineraryVersion,
          as: "currentItineraryVersion",
          include: [
            {
              model: ItineraryDay,
              as: "days",
              include: [{ model: ItineraryStop, as: "stops", include: [{ model: Place, as: "place" }] }],
            },
          ],
        },
      ],
      transaction: this.tx(),
    });
    const coverStop = (
      trip as unknown as {
        currentItineraryVersion?: {
          days?: Array<{ stops?: Array<{ place?: Place | null }> }>;
        };
      } | null
    )?.currentItineraryVersion?.days
      ?.flatMap((day) => day.stops ?? [])
      .find((stop) => stop.place);
    return coverPlaceFromCache(coverStop?.place ?? null);
  }

  async listMembers(tripId: string) {
    const rows = await TripMember.findAll({ where: { tripId }, transaction: this.tx() });
    return rows.map(toStoredMember);
  }

  async ensureHostMembership(tripId: string, userId: string) {
    const [member] = await TripMember.findOrCreate({
      where: { tripId, userId },
      defaults: {
        tripId,
        userId,
        role: "HOST",
        membershipStatus: "ACTIVE",
        joinedAt: new Date(),
      },
      transaction: this.tx(),
    });
    if (member.role !== "HOST" || member.membershipStatus !== "ACTIVE") {
      await member.update({ role: "HOST", membershipStatus: "ACTIVE", leftAt: null }, { transaction: this.tx() });
    }
  }

  async addParticipant(tripId: string, userId: string) {
    const [member] = await TripMember.findOrCreate({
      where: { tripId, userId },
      defaults: {
        tripId,
        userId,
        role: "PARTICIPANT",
        membershipStatus: "ACTIVE",
        joinedAt: new Date(),
      },
      transaction: this.tx(),
    });
    await member.update(
      { role: "PARTICIPANT", membershipStatus: "ACTIVE", leftAt: null, joinedAt: new Date() },
      { transaction: this.tx() },
    );
    return toStoredMember(member);
  }

  async confirmAttendance(tripId: string, userId: string, confirmed: boolean) {
    const member = await TripMember.findOne({
      where: { tripId, userId, membershipStatus: "ACTIVE" },
      transaction: this.tx(),
    });
    if (!member) return null;
    const value = confirmed ? "PRESENT" : "ABSENT";
    if (member.role === "HOST") {
      await member.update({ hostAttendance: value }, { transaction: this.tx() });
    } else {
      await member.update({ selfAttendance: value }, { transaction: this.tx() });
    }
    return toStoredMember(member);
  }

  async leaveMembership(tripId: string, userId: string) {
    const member = await TripMember.findOne({
      where: { tripId, userId, membershipStatus: "ACTIVE" },
      transaction: this.tx(),
    });
    if (!member) return null;
    await member.update({ membershipStatus: "LEFT", leftAt: new Date() }, { transaction: this.tx() });
    return toStoredMember(member);
  }

  async getJoinRequest(id: string) {
    const row = await TripJoinRequest.findByPk(id, { transaction: this.tx() });
    return row ? toStoredJoin(row) : null;
  }

  async getJoinByTripUser(tripId: string, userId: string) {
    const row = await TripJoinRequest.findOne({ where: { tripId, userId }, transaction: this.tx() });
    return row ? toStoredJoin(row) : null;
  }

  async listJoins(tripId: string) {
    const rows = await TripJoinRequest.findAll({ where: { tripId }, transaction: this.tx() });
    return rows.map(toStoredJoin);
  }

  async createJoin(input: Omit<StoredJoin, "id" | "createdAt"> & { id?: string }) {
    const row = await TripJoinRequest.create(
      {
        id: input.id,
        tripId: input.tripId,
        userId: input.userId,
        message: input.message,
        status: input.status,
        reviewedByUserId: input.reviewedByUserId,
        reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : null,
      },
      { transaction: this.tx() },
    );
    return toStoredJoin(row);
  }

  async updateJoin(id: string, patch: Partial<StoredJoin>) {
    const row = await TripJoinRequest.findByPk(id, { transaction: this.tx() });
    if (!row) throw notFound(TripErrorCode.TRIP_NOT_FOUND, "Join request was not found");
    await row.update(
      {
        message: patch.message === undefined ? row.message : patch.message,
        status: patch.status ?? row.status,
        reviewedByUserId: patch.reviewedByUserId === undefined ? row.reviewedByUserId : patch.reviewedByUserId,
        reviewedAt: patch.reviewedAt === undefined ? row.reviewedAt : patch.reviewedAt ? new Date(patch.reviewedAt) : null,
      },
      { transaction: this.tx() },
    );
    return toStoredJoin(row);
  }

  async listComments(tripId: string, page: number, limit: number) {
    const { rows, count } = await TripComment.findAndCountAll({
      where: { tripId, deletedAt: null },
      order: [["createdAt", "ASC"]],
      offset: (page - 1) * limit,
      limit,
      transaction: this.tx(),
    });
    return { items: rows.map(toStoredComment), total: count };
  }

  async getComment(id: string) {
    const row = await TripComment.findByPk(id, { transaction: this.tx() });
    return row ? toStoredComment(row) : null;
  }

  async createComment(input: Omit<StoredComment, "id" | "createdAt"> & { id?: string }) {
    const row = await TripComment.create(
      {
        id: input.id,
        tripId: input.tripId,
        userId: input.userId,
        parentCommentId: input.parentCommentId,
        body: input.body,
        deletedAt: input.deletedAt ? new Date(input.deletedAt) : null,
      },
      { transaction: this.tx() },
    );
    return toStoredComment(row);
  }

  async updateComment(id: string, body: string) {
    const row = await TripComment.findByPk(id, { transaction: this.tx() });
    if (!row || row.deletedAt) throw notFound(TripErrorCode.TRIP_NOT_FOUND, "Comment was not found");
    await row.update({ body }, { transaction: this.tx() });
    return toStoredComment(row);
  }

  async softDeleteComment(id: string) {
    await TripComment.update({ deletedAt: new Date() }, { where: { id }, transaction: this.tx() });
  }

  async ensureChatRoom(tripId: string) {
    await ChatRoom.findOrCreate({
      where: { tripId },
      defaults: { tripId },
      transaction: this.tx(),
    });
  }

  async setChatReadOnly(tripId: string, at: Date) {
    await ChatRoom.update({ readOnlyAt: at }, { where: { tripId }, transaction: this.tx() });
  }

  async isBlocked(userA: string, userB: string) {
    const row = await UserBlock.findOne({
      where: {
        [Op.or]: [
          { blockerUserId: userA, blockedUserId: userB },
          { blockerUserId: userB, blockedUserId: userA },
        ],
      },
      transaction: this.tx(),
    });
    return Boolean(row);
  }

  async addBlock(blockerUserId: string, blockedUserId: string) {
    await UserBlock.findOrCreate({
      where: { blockerUserId, blockedUserId },
      defaults: { blockerUserId, blockedUserId },
      transaction: this.tx(),
    });
  }

  async revokeTripLocation(userId: string, tripId: string) {
    const shares = await LocationShare.findAll({ where: { userId, tripId }, transaction: this.tx() });
    for (const share of shares) {
      await share.update({ revokedAt: new Date() }, { transaction: this.tx() });
      await LocationLatest.destroy({ where: { locationShareId: share.id }, transaction: this.tx() });
    }
  }

  async createNotification(input: {
    recipientUserId: string;
    actorUserId: string;
    type: string;
    targetType: string;
    targetId: string;
    data?: Record<string, unknown>;
  }) {
    if (input.recipientUserId === input.actorUserId) return;
    await Notification.create(
      {
        recipientUserId: input.recipientUserId,
        actorUserId: input.actorUserId,
        type: input.type,
        targetType: input.targetType,
        targetId: input.targetId,
        data: input.data ?? {},
      },
      { transaction: this.tx() },
    );
  }

  async findIdempotency(actorUserId: string, operation: string, key: string): Promise<StoredIdempotency | null> {
    const row = await IdempotencyKey.findOne({
      where: { actorUserId, operation, key },
      transaction: this.tx(),
    });
    if (!row || row.expiresAt.getTime() < Date.now() || row.responseStatus == null) return null;
    return {
      requestHash: row.requestHash,
      responseStatus: row.responseStatus,
      responseBody: row.responseBody,
    };
  }

  async saveIdempotency(
    actorUserId: string,
    operation: string,
    key: string,
    requestHash: string,
    responseStatus: number,
    responseBody: unknown,
    expiresAt: Date,
  ) {
    await IdempotencyKey.create(
      {
        actorUserId,
        operation,
        key,
        requestHash,
        responseStatus,
        responseBody: responseBody as object,
        expiresAt,
      },
      { transaction: this.tx() },
    );
  }

  async withTripLock<T>(tripId: string, fn: (trip: StoredTrip) => Promise<T>): Promise<T> {
    const sequelize = getSequelize();
    return sequelize.transaction(async (transaction) => {
      return txContext.run(transaction, async () => {
        const trip = await Trip.findByPk(tripId, { lock: transaction.LOCK.UPDATE, transaction });
        if (!trip) throw notFound(TripErrorCode.TRIP_NOT_FOUND, "Trip was not found");
        return fn(toStoredTrip(trip));
      });
    });
  }

  private async pageTrips(where: Record<string, unknown>, page: number, limit: number): Promise<PageResult<StoredTrip>> {
    const idFilter = where.id;
    if (Array.isArray(idFilter) && idFilter.length === 0) return { items: [], total: 0 };
    const { rows, count } = await Trip.findAndCountAll({
      where,
      order: [["updatedAt", "DESC"]],
      offset: (page - 1) * limit,
      limit,
      transaction: this.tx(),
    });
    return { items: rows.map(toStoredTrip), total: count };
  }
}

function toStoredTrip(trip: Trip): StoredTrip {
  return {
    id: trip.id,
    hostUserId: trip.hostUserId,
    title: trip.title,
    description: trip.description ?? null,
    visibility: trip.visibility,
    status: trip.status,
    startDate: dateOnly(trip.startDate),
    endDate: dateOnly(trip.endDate),
    timezone: trip.timezone,
    privateOriginLabel: trip.privateOriginLabel ?? null,
    privateOriginLatitude: trip.privateOriginLatitude ?? null,
    privateOriginLongitude: trip.privateOriginLongitude ?? null,
    destinationCity: trip.destinationCity ?? null,
    publicMeetingPointLabel: trip.publicMeetingPointLabel ?? null,
    publicMeetingPointLatitude: trip.publicMeetingPointLatitude ?? null,
    publicMeetingPointLongitude: trip.publicMeetingPointLongitude ?? null,
    transportMode: trip.transportMode ?? null,
    budgetAmount: trip.budgetAmount == null ? null : String(trip.budgetAmount),
    budgetBasis: trip.budgetBasis,
    currency: trip.currency,
    planningPartySize: trip.planningPartySize,
    maxParticipants: trip.maxParticipants ?? null,
    genderRule: trip.genderRule,
    communityRules: trip.communityRules ?? null,
    currentItineraryVersionId: trip.currentItineraryVersionId ?? null,
    preferences: (trip.preferences as Record<string, unknown> | null) ?? null,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

function toStoredMember(member: TripMember): StoredMember {
  const confirmed =
    member.role === "HOST" ? member.hostAttendance === "PRESENT" : member.selfAttendance === "PRESENT";
  return {
    id: member.id,
    tripId: member.tripId,
    userId: member.userId,
    role: member.role,
    membershipStatus: member.membershipStatus,
    attendanceConfirmed: confirmed,
    showOnProfile: member.showOnProfile ?? true,
    joinedAt: member.joinedAt.toISOString(),
    leftAt: member.leftAt ? member.leftAt.toISOString() : null,
  };
}

function toStoredJoin(row: TripJoinRequest): StoredJoin {
  return {
    id: row.id,
    tripId: row.tripId,
    userId: row.userId,
    message: row.message ?? null,
    status: row.status,
    reviewedByUserId: row.reviewedByUserId ?? null,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toStoredComment(row: TripComment): StoredComment {
  return {
    id: row.id,
    tripId: row.tripId,
    userId: row.userId,
    parentCommentId: row.parentCommentId ?? null,
    body: row.body,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function dateOnly(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

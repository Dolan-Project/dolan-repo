import { randomUUID } from "node:crypto";
import type { AuthIdentity, JoinRequestStatus, MembershipStatus, PlaceSummary } from "@dolan/shared";
import { TripErrorCode } from "@dolan/shared";
import { notFound } from "../../lib/api-error.ts";
import { createSeededMemoryUsers } from "../auth/user-repository.ts";
import type {
  PageResult,
  StoredComment,
  StoredIdempotency,
  StoredJoin,
  StoredMember,
  StoredTrip,
  TripStore,
} from "./types.ts";

type StoredBlock = { blockerUserId: string; blockedUserId: string };
type StoredLocation = { userId: string; tripId: string; revokedAt: string | null };

export class MemoryTripStore implements TripStore {
  readonly trips: StoredTrip[] = [];
  readonly members: StoredMember[] = [];
  readonly joins: StoredJoin[] = [];
  readonly comments: StoredComment[] = [];
  readonly chatRooms = new Map<string, { readOnlyAt: string | null }>();
  readonly notifications: Array<{ recipientUserId: string; actorUserId: string; type: string }> = [];
  readonly usages: StoredLocation[] = [];
  readonly coverPlaces = new Map<string, PlaceSummary>();
  private readonly blocks: StoredBlock[] = [];
  private readonly users = new Map<string, AuthIdentity>();
  private readonly idempotency = new Map<string, StoredIdempotency>();
  private readonly locks = new Map<string, Promise<void>>();

  constructor(seedUsers: AuthIdentity[] = createSeededMemoryUsers()) {
    for (const user of seedUsers) this.users.set(user.id, user);
  }

  async getUser(userId: string) {
    return this.users.get(userId) ?? null;
  }

  async upsertUser(user: AuthIdentity) {
    this.users.set(user.id, user);
  }

  async getTrip(tripId: string) {
    return this.trips.find((trip) => trip.id === tripId) ?? null;
  }

  async createTrip(input: Omit<StoredTrip, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const now = new Date().toISOString();
    const trip: StoredTrip = {
      ...input,
      id: input.id ?? randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.trips.push(trip);
    return trip;
  }

  async updateTrip(tripId: string, patch: Partial<StoredTrip>) {
    const trip = await this.requireTrip(tripId);
    Object.assign(trip, patch, { updatedAt: new Date().toISOString() });
    return trip;
  }

  async deleteTrip(tripId: string) {
    const index = this.trips.findIndex((trip) => trip.id === tripId);
    if (index >= 0) this.trips.splice(index, 1);
    const leftover = {
      members: this.members.filter((row) => row.tripId !== tripId),
      joins: this.joins.filter((row) => row.tripId !== tripId),
      comments: this.comments.filter((row) => row.tripId !== tripId),
    };
    this.members.length = 0;
    this.members.push(...leftover.members);
    this.joins.length = 0;
    this.joins.push(...leftover.joins);
    this.comments.length = 0;
    this.comments.push(...leftover.comments);
    this.chatRooms.delete(tripId);
    this.coverPlaces.delete(tripId);
  }

  async listHosted(userId: string, page: number, limit: number) {
    return slice(
      this.trips.filter((trip) => trip.hostUserId === userId).sort(byUpdated),
      page,
      limit,
    );
  }

  async listJoined(userId: string, page: number, limit: number) {
    const ids = new Set(
      this.members
        .filter((member) => member.userId === userId && member.role === "PARTICIPANT" && member.membershipStatus === "ACTIVE")
        .map((member) => member.tripId),
    );
    return slice(
      this.trips.filter((trip) => ids.has(trip.id)).sort(byUpdated),
      page,
      limit,
    );
  }

  async listPending(userId: string, page: number, limit: number) {
    const ids = new Set(
      this.joins.filter((row) => row.userId === userId && row.status === "PENDING").map((row) => row.tripId),
    );
    return slice(
      this.trips.filter((trip) => ids.has(trip.id)).sort(byUpdated),
      page,
      limit,
    );
  }

  async getCoverPlace(tripId: string) {
    return this.coverPlaces.get(tripId) ?? null;
  }

  setCoverPlace(tripId: string, place: PlaceSummary) {
    this.coverPlaces.set(tripId, place);
  }

  async listMembers(tripId: string) {
    return this.members.filter((member) => member.tripId === tripId);
  }

  async ensureHostMembership(tripId: string, userId: string) {
    const existing = this.members.find((member) => member.tripId === tripId && member.userId === userId);
    if (existing) {
      existing.role = "HOST";
      existing.membershipStatus = "ACTIVE";
      existing.leftAt = null;
      return;
    }
    this.members.push({
      id: randomUUID(),
      tripId,
      userId,
      role: "HOST",
      membershipStatus: "ACTIVE",
      attendanceConfirmed: false,
      attendanceDisputed: false,
      hostAttendance: "UNCONFIRMED",
      selfAttendance: "UNCONFIRMED",
      showOnProfile: true,
      joinedAt: new Date().toISOString(),
      leftAt: null,
    });
  }

  async addParticipant(tripId: string, userId: string) {
    const existing = this.members.find((member) => member.tripId === tripId && member.userId === userId);
    if (existing) {
      existing.role = "PARTICIPANT";
      existing.membershipStatus = "ACTIVE";
      existing.leftAt = null;
      existing.joinedAt = new Date().toISOString();
      return existing;
    }
    const member: StoredMember = {
      id: randomUUID(),
      tripId,
      userId,
      role: "PARTICIPANT",
      membershipStatus: "ACTIVE",
      attendanceConfirmed: false,
      attendanceDisputed: false,
      hostAttendance: "UNCONFIRMED",
      selfAttendance: "UNCONFIRMED",
      showOnProfile: true,
      joinedAt: new Date().toISOString(),
      leftAt: null,
    };
    this.members.push(member);
    return member;
  }

  async confirmAttendance(
    tripId: string,
    actorUserId: string,
    input: { confirmed: boolean; targetUserId?: string },
  ) {
    const actor = this.members.find(
      (row) => row.tripId === tripId && row.userId === actorUserId && row.membershipStatus === "ACTIVE",
    );
    if (!actor) return null;
    const targetId = input.targetUserId ?? actorUserId;
    const member = this.members.find(
      (row) => row.tripId === tripId && row.userId === targetId && row.membershipStatus === "ACTIVE",
    );
    if (!member) return null;
    const value = input.confirmed ? "PRESENT" : "ABSENT";
    if (input.targetUserId && input.targetUserId !== actorUserId) {
      if (actor.role !== "HOST") return null;
      member.hostAttendance = value;
    } else if (member.role === "HOST") {
      member.hostAttendance = value;
      member.selfAttendance = value;
    } else {
      member.selfAttendance = value;
    }
    if (
      member.role === "PARTICIPANT" &&
      (member.hostAttendance === "PRESENT" || member.hostAttendance === "ABSENT") &&
      (member.selfAttendance === "PRESENT" || member.selfAttendance === "ABSENT") &&
      member.hostAttendance !== member.selfAttendance
    ) {
      member.hostAttendance = "DISPUTED";
      member.selfAttendance = "DISPUTED";
      member.attendanceDisputed = true;
      member.attendanceConfirmed = false;
    } else {
      member.attendanceDisputed = false;
      member.attendanceConfirmed =
        member.role === "HOST"
          ? member.hostAttendance === "PRESENT" || member.selfAttendance === "PRESENT"
          : member.selfAttendance === "PRESENT" &&
            member.hostAttendance !== "ABSENT" &&
            member.hostAttendance !== "DISPUTED";
    }
    return member;
  }

  async leaveMembership(tripId: string, userId: string) {
    const member = this.members.find(
      (row) => row.tripId === tripId && row.userId === userId && row.membershipStatus === "ACTIVE",
    );
    if (!member) return null;
    member.membershipStatus = "LEFT";
    member.leftAt = new Date().toISOString();
    return member;
  }

  async getJoinRequest(id: string) {
    return this.joins.find((row) => row.id === id) ?? null;
  }

  async getJoinByTripUser(tripId: string, userId: string) {
    return this.joins.find((row) => row.tripId === tripId && row.userId === userId) ?? null;
  }

  async listJoins(tripId: string) {
    return this.joins.filter((row) => row.tripId === tripId);
  }

  async createJoin(input: Omit<StoredJoin, "id" | "createdAt"> & { id?: string }) {
    const row: StoredJoin = {
      ...input,
      id: input.id ?? randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.joins.push(row);
    return row;
  }

  async updateJoin(id: string, patch: Partial<StoredJoin>) {
    const row = this.joins.find((item) => item.id === id);
    if (!row) throw notFound(TripErrorCode.TRIP_NOT_FOUND, "Join request was not found");
    Object.assign(row, patch);
    return row;
  }

  async listComments(tripId: string, page: number, limit: number) {
    return slice(
      this.comments
        .filter((row) => row.tripId === tripId && !row.deletedAt)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      page,
      limit,
    );
  }

  async getComment(id: string) {
    return this.comments.find((row) => row.id === id) ?? null;
  }

  async createComment(input: Omit<StoredComment, "id" | "createdAt"> & { id?: string }) {
    const row: StoredComment = {
      ...input,
      id: input.id ?? randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.comments.push(row);
    return row;
  }

  async updateComment(id: string, body: string) {
    const row = this.comments.find((item) => item.id === id);
    if (!row || row.deletedAt) throw notFound(TripErrorCode.TRIP_NOT_FOUND, "Comment was not found");
    row.body = body;
    return row;
  }

  async softDeleteComment(id: string) {
    const row = this.comments.find((item) => item.id === id);
    if (row) row.deletedAt = new Date().toISOString();
  }

  async ensureChatRoom(tripId: string) {
    if (!this.chatRooms.has(tripId)) this.chatRooms.set(tripId, { readOnlyAt: null });
  }

  async setChatReadOnly(tripId: string, at: Date) {
    const room = this.chatRooms.get(tripId) ?? { readOnlyAt: null };
    room.readOnlyAt = at.toISOString();
    this.chatRooms.set(tripId, room);
  }

  async isBlocked(userA: string, userB: string) {
    return this.blocks.some(
      (row) =>
        (row.blockerUserId === userA && row.blockedUserId === userB) ||
        (row.blockerUserId === userB && row.blockedUserId === userA),
    );
  }

  async addBlock(blockerUserId: string, blockedUserId: string) {
    this.blocks.push({ blockerUserId, blockedUserId });
  }

  async revokeTripLocation(userId: string, tripId: string) {
    this.usages.push({ userId, tripId, revokedAt: new Date().toISOString() });
  }

  async publishTripAsTemplate(tripId: string, _creatorUserId: string) {
    const trip = this.trips.find((row) => row.id === tripId);
    if (!trip) throw notFound(TripErrorCode.TRIP_NOT_FOUND, "Trip not found");
    return { templateId: randomUUID(), title: trip.title };
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
    this.notifications.push({
      recipientUserId: input.recipientUserId,
      actorUserId: input.actorUserId,
      type: input.type,
    });
  }

  async findIdempotency(actorUserId: string, operation: string, key: string) {
    return this.idempotency.get(`${actorUserId}:${operation}:${key}`) ?? null;
  }

  async saveIdempotency(
    actorUserId: string,
    operation: string,
    key: string,
    requestHash: string,
    responseStatus: number,
    responseBody: unknown,
    _expiresAt: Date,
  ) {
    this.idempotency.set(`${actorUserId}:${operation}:${key}`, {
      requestHash,
      responseStatus,
      responseBody,
    });
  }

  async withTripLock<T>(tripId: string, fn: (trip: StoredTrip) => Promise<T>): Promise<T> {
    const previous = this.locks.get(tripId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(tripId, previous.then(() => current));
    await previous;
    try {
      const trip = await this.requireTrip(tripId);
      return await fn(trip);
    } finally {
      release();
    }
  }

  countActive(tripId: string) {
    return this.members.filter((member) => member.tripId === tripId && member.membershipStatus === "ACTIVE").length;
  }

  countPending(tripId: string) {
    return this.joins.filter((row) => row.tripId === tripId && row.status === "PENDING").length;
  }

  private async requireTrip(tripId: string) {
    const trip = await this.getTrip(tripId);
    if (!trip) throw notFound(TripErrorCode.TRIP_NOT_FOUND, "Trip was not found");
    return trip;
  }
}

function slice<T>(items: T[], page: number, limit: number): PageResult<T> {
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total: items.length };
}

function byUpdated(a: StoredTrip, b: StoredTrip) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export type { JoinRequestStatus, MembershipStatus };

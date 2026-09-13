import {
  attendanceBodySchema,
  createReportBodySchema,
  createReviewBodySchema,
  moderateReportBodySchema,
  type SessionActor,
} from "@dolan/shared";
import { badRequest, conflict, forbidden } from "../../lib/api-error.ts";
import { zodFields } from "../../lib/zod-fields.ts";
import type { AuthService } from "../auth/auth-service.ts";
import type { TripService } from "../trips/trip-service.ts";
import type { SocialQueryStore } from "./social-queries.ts";

function requireUser(actor: SessionActor) {
  if (actor.kind !== "user") throw forbidden("UNAUTHORIZED", "Authentication required");
  return actor.user;
}

export class SocialService {
  constructor(
    private readonly auth: AuthService,
    private readonly social: SocialQueryStore,
    private readonly trips: TripService,
  ) {}

  async confirmAttendance(actor: SessionActor, tripId: string, body: unknown) {
    const parsed = attendanceBodySchema.safeParse(body ?? {});
    if (!parsed.success) throw badRequest("VALIDATION_ERROR", "Periksa kembali isian form", zodFields(parsed.error));
    return this.trips.confirmAttendance(actor, tripId, parsed.data.confirmed);
  }

  async createReview(actor: SessionActor, username: string, body: unknown) {
    const user = requireUser(actor);
    const target = await this.auth.resolveUser(username);
    if (user.id === target.id) throw badRequest("SELF_REVIEW", "Tidak bisa mereview diri sendiri");
    const parsed = createReviewBodySchema.safeParse(body);
    if (!parsed.success) throw badRequest("VALIDATION_ERROR", "Periksa kembali isian form", zodFields(parsed.error));
    const eligible = await this.trips.reviewEligibility(parsed.data.tripId, user.id, target.id);
    if (!eligible.allowed) {
      throw conflict("NOT_ELIGIBLE", "Review hanya untuk peserta trip selesai yang sudah konfirmasi kehadiran");
    }
    return this.social.createReview({
      tripId: parsed.data.tripId,
      reviewerUserId: user.id,
      revieweeUserId: target.id,
      communication: parsed.data.communication,
      attitude: parsed.data.attitude,
      comment: parsed.data.comment ?? null,
    });
  }

  async listReviews(username: string) {
    const target = await this.auth.resolveUser(username);
    const items = await this.social.listVisibleReviews(target.id);
    const rating = await this.social.ratingFor(target.id);
    return { items, rating };
  }

  async history(username: string, actor: SessionActor) {
    const target = await this.auth.resolveUser(username);
    const viewerId = actor.kind === "user" ? actor.user.id : null;
    return this.trips.historyFor(target.id, viewerId);
  }

  async createReport(actor: SessionActor, body: unknown) {
    const user = requireUser(actor);
    const parsed = createReportBodySchema.safeParse(body);
    if (!parsed.success) throw badRequest("VALIDATION_ERROR", "Periksa kembali isian form", zodFields(parsed.error));
    let targetId = parsed.data.targetId;
    if (parsed.data.targetType === "user") {
      const target = await this.auth.resolveUser(targetId);
      targetId = target.id;
    }
    return this.social.createReport({
      reporterId: user.id,
      targetType: parsed.data.targetType,
      targetId,
      reason: parsed.data.reason,
    });
  }

  async listReports(actor: SessionActor) {
    requireUser(actor);
    return { items: await this.social.listReports() };
  }

  async moderateReport(actor: SessionActor, reportId: string, body: unknown) {
    const user = requireUser(actor);
    const parsed = moderateReportBodySchema.safeParse(body);
    if (!parsed.success) throw badRequest("VALIDATION_ERROR", "Periksa kembali isian form", zodFields(parsed.error));
    return this.social.moderateReport(reportId, user.id, parsed.data.action);
  }
}

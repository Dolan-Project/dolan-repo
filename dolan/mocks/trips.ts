import type {
  ApiError,
  ApiSuccess,
  CreateTripInput,
  MyTripRole,
  MyTripSummary,
  TripDetail,
  TripViewerRole,
} from "@/lib/contracts";
import { sampleOtherUser, samplePublicUser } from "./fixtures";
import { meetingPointFor, resolveGeoPlace } from "./geo";
import { createApiError, type MockScenario } from "./scenarios";

const idempotentCreates = new Map<string, string>();
const trips = new Map<string, TripDetail>();
const roles = new Map<string, TripViewerRole>();

function moneyString(value: number | string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return String(value);
  return value;
}

type SeedInput = Omit<Partial<TripDetail>, "budgetAmount" | "joinFree"> & {
  id: string;
  title: string;
  host: TripDetail["host"];
  viewerRole: TripViewerRole;
  budgetAmount?: string | number | null;
};

function buildDetail(input: SeedInput): TripDetail {
  const origin = input.origin ?? input.privateOriginLabel ?? "Jakarta";
  const meetingPoint =
    input.meetingPoint ?? input.publicMeetingPointLabel ?? null;
  const transport = input.transport ?? input.transportMode ?? "Darat";
  const originPlace = resolveGeoPlace(origin);
  const meeting = meetingPointFor(meetingPoint, input.destinationCity);
  return {
    id: input.id,
    title: input.title,
    description: input.description ?? null,
    visibility: input.visibility ?? "PUBLIC",
    status: input.status ?? "OPEN",
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    timezone: input.timezone ?? "Asia/Jakarta",
    destinationCity: input.destinationCity ?? null,
    transportMode: transport,
    budgetAmount: moneyString(input.budgetAmount) ?? "0",
    budgetBasis: input.budgetBasis ?? "PER_PERSON",
    currency: input.currency ?? "IDR",
    planningPartySize: input.planningPartySize ?? 1,
    maxParticipants: input.maxParticipants ?? null,
    publicMeetingPointLabel: meetingPoint,
    publicMeetingPointLatitude:
      meeting?.latitude ?? input.publicMeetingPointLatitude ?? null,
    publicMeetingPointLongitude:
      meeting?.longitude ?? input.publicMeetingPointLongitude ?? null,
    privateOriginLabel: origin,
    privateOriginLatitude:
      originPlace?.latitude ?? input.privateOriginLatitude ?? null,
    privateOriginLongitude:
      originPlace?.longitude ?? input.privateOriginLongitude ?? null,
    preferences: input.preferences ?? null,
    host: input.host,
    viewerRole: input.viewerRole,
    activeParticipantCount: input.activeParticipantCount ?? 1,
    pendingRequestCount: input.pendingRequestCount ?? 0,
    joinFree: true,
    currentItineraryVersionId: input.currentItineraryVersionId ?? null,
    myJoinRequest: input.myJoinRequest ?? null,
    origin,
    meetingPoint,
    transport,
    activityPrefs: input.activityPrefs ?? [],
    lodgingPref: input.lodgingPref ?? "",
    companionNote: input.companionNote ?? "",
  };
}

function detailToSummary(detail: TripDetail): MyTripSummary {
  return {
    id: detail.id,
    title: detail.title,
    destinationCity: detail.destinationCity,
    visibility: detail.visibility,
    status: detail.status,
    startDate: detail.startDate,
    endDate: detail.endDate,
    participantCount: detail.activeParticipantCount,
    pendingRequestCount: detail.pendingRequestCount,
    coverPlace: null,
    publicMeetingPointLabel: detail.publicMeetingPointLabel,
    publicMeetingPointLatitude: detail.publicMeetingPointLatitude,
    publicMeetingPointLongitude: detail.publicMeetingPointLongitude,
    host: detail.host,
    maxParticipants: detail.maxParticipants,
  };
}

function seed() {
  if (trips.has("trip_1")) return;
  const hosted = buildDetail({
    id: "trip_1",
    title: "Jelajah Yogyakarta",
    visibility: "PUBLIC",
    status: "OPEN",
    startDate: "2026-10-01",
    endDate: "2026-10-03",
    host: samplePublicUser,
    destinationCity: "Yogyakarta",
    activeParticipantCount: 1,
    maxParticipants: 6,
    description: "Heritage walk Jogja",
    origin: "Jakarta",
    meetingPoint: "Stasiun Tugu",
    transport: "Kereta",
    planningPartySize: 4,
    budgetAmount: 1_500_000,
    budgetBasis: "PER_PERSON",
    activityPrefs: ["Kuliner"],
    lodgingPref: "Homestay",
    companionNote: "Join gratis, biaya mandiri.",
    viewerRole: "host",
  });
  const joined = buildDetail({
    ...hosted,
    id: "trip_joined",
    title: "Ekspedisi Rinjani Sembalun",
    host: sampleOtherUser,
    destinationCity: "Lombok",
    startDate: "2026-12-10",
    endDate: "2026-12-14",
    meetingPoint: "Sembalun Lawang",
    viewerRole: "participant",
    activeParticipantCount: 3,
  });
  const pending = buildDetail({
    ...hosted,
    id: "trip_pending",
    title: "Open Trip Karimunjawa",
    host: sampleOtherUser,
    destinationCity: "Karimunjawa",
    startDate: "2026-11-08",
    endDate: "2026-11-11",
    meetingPoint: "Pelabuhan Kartini Jepara",
    viewerRole: "pending",
    activeParticipantCount: 5,
    maxParticipants: 8,
  });
  const ongoing = buildDetail({
    ...joined,
    id: "trip_ongoing",
    title: "Camp Bromo Weekend",
    destinationCity: "Bromo",
    status: "ONGOING",
    startDate: "2026-09-12",
    endDate: "2026-09-14",
    meetingPoint: "Cemoro Lawang",
    viewerRole: "participant",
    activeParticipantCount: 4,
  });
  const closed = buildDetail({
    ...hosted,
    id: "trip_closed",
    title: "Weekend Dieng",
    destinationCity: "Dieng",
    status: "CLOSED",
    startDate: "2026-08-20",
    endDate: "2026-08-22",
    meetingPoint: "Alun-alun Wonosobo",
    viewerRole: "host",
    activeParticipantCount: 3,
    maxParticipants: 6,
  });
  trips.set(hosted.id, { ...hosted, activeParticipantCount: 6 });
  trips.set(joined.id, joined);
  trips.set(pending.id, pending);
  trips.set(ongoing.id, ongoing);
  trips.set(closed.id, closed);
  roles.set(hosted.id, "host");
  roles.set(joined.id, "participant");
  roles.set(pending.id, "pending");
  roles.set(ongoing.id, "participant");
  roles.set(closed.id, "host");
}

export function mockListMyTrips(
  scenario: MockScenario,
  role: MyTripRole,
): ApiSuccess<MyTripSummary[]> | ApiError {
  seed();
  if (scenario === "unauthorized") {
    return createApiError("UNAUTHORIZED", "Tidak sah");
  }
  if (scenario === "empty") {
    return { success: true, data: [] };
  }
  if (scenario === "providerError") {
    return createApiError("PROVIDER_UNAVAILABLE", "Gagal memuat trip");
  }
  const wanted: TripViewerRole =
    role === "hosted" ? "host" : role === "joined" ? "participant" : "pending";
  const data = [...trips.values()]
    .filter((trip) => roles.get(trip.id) === wanted)
    .map(detailToSummary);
  return { success: true, data };
}

export function mockGetTrip(
  scenario: MockScenario,
  tripId = "trip_1",
): ApiSuccess<TripDetail> | ApiError {
  seed();
  if (scenario === "empty" || scenario === "unauthorized") {
    return createApiError("NOT_FOUND", "Trip tidak ditemukan");
  }
  const trip = trips.get(tripId);
  if (!trip) return createApiError("NOT_FOUND", "Trip tidak ditemukan");
  return {
    success: true,
    data: { ...trip, viewerRole: roles.get(trip.id) ?? "visitor" },
  };
}

export function mockCreateTrip(
  scenario: MockScenario,
  input?: CreateTripInput,
  idempotencyKey?: string,
): ApiSuccess<TripDetail> | ApiError {
  seed();
  if (scenario === "validationError") {
    return createApiError("INVALID_DATE", "Tanggal tidak valid");
  }
  if (idempotencyKey && idempotentCreates.has(idempotencyKey)) {
    const existing = trips.get(idempotentCreates.get(idempotencyKey)!);
    if (existing) return { success: true, data: existing };
  }
  const id = `trip_${trips.size + 1}`;
  const detail = buildDetail({
    id,
    title: input?.title ?? "Jelajah Yogyakarta",
    visibility: input?.visibility ?? "PRIVATE",
    status: "DRAFT",
    startDate: input?.startDate ?? "2026-10-01",
    endDate: input?.endDate ?? "2026-10-03",
    host: samplePublicUser,
    destinationCity: input?.destinationCity ?? "Yogyakarta",
    activeParticipantCount: 1,
    maxParticipants: input?.maxParticipants ?? null,
    description: input?.description ?? "",
    origin: input?.origin ?? "Jakarta",
    meetingPoint: input?.meetingPoint || null,
    transport: input?.transport ?? "Darat",
    planningPartySize: input?.planningPartySize ?? 1,
    budgetAmount: input?.budgetAmount ?? 0,
    budgetBasis: input?.budgetBasis ?? "PER_PERSON",
    activityPrefs: input?.activityPrefs ?? [],
    lodgingPref: input?.lodgingPref ?? "",
    companionNote: input?.companionNote ?? "",
    viewerRole: "host",
  });
  trips.set(id, detail);
  roles.set(id, "host");
  if (idempotencyKey) idempotentCreates.set(idempotencyKey, id);
  return { success: true, data: detail };
}

export function mockPublishTrip(
  scenario: MockScenario,
  tripId?: string,
): ApiSuccess<TripDetail> | ApiError {
  seed();
  if (scenario === "validationError") {
    return createApiError("PROFILE_INCOMPLETE", "Lengkapi profil dulu");
  }
  const id = tripId ?? "trip_1";
  const trip = trips.get(id);
  if (!trip) return createApiError("NOT_FOUND", "Trip tidak ditemukan");
  if (roles.get(id) !== "host") {
    return createApiError("UNAUTHORIZED", "Hanya host yang dapat publish");
  }
  const published: TripDetail = {
    ...trip,
    status: trip.visibility === "PUBLIC" ? "OPEN" : "CLOSED",
  };
  trips.set(id, published);
  return { success: true, data: published };
}

export function mockUpdateTrip(
  tripId: string,
  input: CreateTripInput,
): ApiSuccess<TripDetail> | ApiError {
  seed();
  const trip = trips.get(tripId);
  if (!trip) return createApiError("NOT_FOUND", "Trip tidak ditemukan");
  if (roles.get(tripId) !== "host") {
    return createApiError("UNAUTHORIZED", "Hanya host yang dapat mengedit");
  }
  const nextCapacity = input.maxParticipants ?? trip.maxParticipants;
  if (nextCapacity != null && nextCapacity < trip.activeParticipantCount) {
    return createApiError(
      "CAPACITY_BELOW_MEMBERS",
      "Kapasitas tidak boleh di bawah anggota aktif",
    );
  }
  const updated = buildDetail({
    ...trip,
    title: input.title,
    description: input.description ?? trip.description,
    origin: input.origin,
    destinationCity: input.destinationCity,
    startDate: input.startDate,
    endDate: input.endDate,
    transport: input.transport,
    planningPartySize: input.planningPartySize,
    budgetAmount: input.budgetAmount,
    budgetBasis: input.budgetBasis,
    activityPrefs: input.activityPrefs ?? trip.activityPrefs,
    lodgingPref: input.lodgingPref ?? trip.lodgingPref,
    visibility: input.visibility,
    maxParticipants: nextCapacity,
    meetingPoint: input.meetingPoint || trip.meetingPoint,
    companionNote: input.companionNote ?? trip.companionNote,
    viewerRole: "host",
  });
  trips.set(tripId, updated);
  return { success: true, data: updated };
}

export function mockLeaveTrip(
  scenario: MockScenario,
  tripId: string,
  confirmLeave = false,
): ApiSuccess<{ left: true }> | ApiError {
  seed();
  if (scenario === "unauthorized") {
    return createApiError("UNAUTHORIZED", "Tidak sah");
  }
  const role = roles.get(tripId);
  if (role !== "participant") {
    return createApiError("NOT_MEMBER", "Pending bukan peserta");
  }
  const trip = trips.get(tripId);
  if (trip?.status === "ONGOING" && !confirmLeave) {
    return createApiError(
      "LEAVE_CONFIRM_REQUIRED",
      "Konfirmasi dulu sebelum keluar saat trip berlangsung",
    );
  }
  roles.delete(tripId);
  return { success: true, data: { left: true } };
}

export function mockTransitionTrip(
  tripId: string,
  action: "close" | "cancel" | "start" | "complete" | "reopen",
): ApiSuccess<TripDetail> | ApiError {
  seed();
  const trip = trips.get(tripId);
  if (!trip) return createApiError("NOT_FOUND", "Trip tidak ditemukan");
  if (roles.get(tripId) !== "host") {
    return createApiError("UNAUTHORIZED", "Hanya host yang dapat mengubah status");
  }
  if (action === "reopen") {
    if (trip.status !== "CLOSED") {
      return createApiError(
        "INVALID_TRANSITION",
        "Hanya trip tertutup yang bisa dibuka lagi",
      );
    }
    const updated = { ...trip, status: "OPEN" as const };
    trips.set(tripId, updated);
    return { success: true, data: updated };
  }
  const next =
    action === "close"
      ? "CLOSED"
      : action === "cancel"
        ? "CANCELLED"
        : action === "start"
          ? "ONGOING"
          : "COMPLETED";
  const updated = { ...trip, status: next as TripDetail["status"] };
  trips.set(tripId, updated);
  return { success: true, data: updated };
}

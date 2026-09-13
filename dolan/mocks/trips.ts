import type {
  ApiError,
  ApiSuccess,
  MyTripRole,
  MyTripSummary,
} from "@/lib/contracts";
import { samplePublicUser } from "./fixtures";
import { createApiError, type MockScenario } from "./scenarios";

const sampleTrip: MyTripSummary = {
  id: "trip_1",
  title: "Jelajah Yogyakarta",
  destinationCity: "Yogyakarta",
  visibility: "PUBLIC",
  status: "OPEN",
  startDate: "2026-10-01",
  endDate: "2026-10-03",
  participantCount: 1,
  pendingRequestCount: 0,
  coverPlace: null,
  publicMeetingPointLabel: "Tugu Yogyakarta",
  publicMeetingPointLatitude: -7.7828,
  publicMeetingPointLongitude: 110.3671,
  host: samplePublicUser,
  maxParticipants: 6,
};

export function mockListMyTrips(
  scenario: MockScenario,
  role: MyTripRole,
): ApiSuccess<MyTripSummary[]> | ApiError {
  if (scenario === "unauthorized") {
    return createApiError("UNAUTHORIZED", "Tidak sah");
  }
  if (scenario === "empty" || role === "pending") {
    return { success: true, data: [] };
  }
  if (scenario === "providerError") {
    return createApiError("PROVIDER_UNAVAILABLE", "Gagal memuat trip");
  }
  return { success: true, data: [sampleTrip] };
}

export function mockGetTrip(
  scenario: MockScenario,
): ApiSuccess<MyTripSummary> | ApiError {
  if (scenario === "empty") {
    return createApiError("NOT_FOUND", "Trip tidak ditemukan");
  }
  if (scenario === "unauthorized") {
    return createApiError("NOT_FOUND", "Trip tidak ditemukan");
  }
  return { success: true, data: sampleTrip };
}

export function mockCreateTrip(
  scenario: MockScenario,
): ApiSuccess<MyTripSummary> | ApiError {
  if (scenario === "validationError") {
    return createApiError("INVALID_DATE", "Tanggal tidak valid");
  }
  return { success: true, data: { ...sampleTrip, status: "DRAFT", visibility: "PRIVATE" } };
}

export function mockPublishTrip(
  scenario: MockScenario,
): ApiSuccess<MyTripSummary> | ApiError {
  if (scenario === "validationError") {
    return createApiError("PROFILE_INCOMPLETE", "Lengkapi profil dulu");
  }
  return { success: true, data: { ...sampleTrip, status: "OPEN", visibility: "PUBLIC" } };
}

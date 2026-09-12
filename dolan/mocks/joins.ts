import type { ApiError, ApiSuccess, JoinRequest, TripComment } from "@dolan/shared";
import { samplePublicUser } from "./fixtures";
import { createApiError, type MockScenario } from "./scenarios";

const sampleJoin: JoinRequest = {
  id: "join_1",
  tripId: "trip_1",
  applicant: samplePublicUser,
  message: "Ikut ya",
  status: "PENDING",
};

export function mockRequestJoin(
  scenario: MockScenario,
): ApiSuccess<JoinRequest> | ApiError {
  if (scenario === "quotaError") {
    return createApiError("TRIP_FULL", "Trip penuh");
  }
  if (scenario === "validationError") {
    return createApiError("DUPLICATE_REQUEST", "Pengajuan sudah ada");
  }
  if (scenario === "unauthorized") {
    return createApiError("UNAUTHORIZED", "Tidak sah");
  }
  return { success: true, data: sampleJoin };
}

export function mockListComments(
  scenario: MockScenario,
): ApiSuccess<TripComment[]> | ApiError {
  if (scenario === "empty") {
    return { success: true, data: [] };
  }
  return {
    success: true,
    data: [
      {
        id: "c1",
        tripId: "trip_1",
        author: samplePublicUser,
        parentId: null,
        body: "Join gratis, biaya masing-masing.",
        createdAt: "2026-09-12T00:00:00.000Z",
      },
    ],
  };
}

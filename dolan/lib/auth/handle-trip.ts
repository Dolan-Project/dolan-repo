import {
  createTripSchema,
  publishTripSchema,
  updateTripSchema,
  type MyTripRole,
} from "@/lib/contracts";
import {
  mockCreateTrip,
  mockGetTrip,
  mockLeaveTrip,
  mockListMyTrips,
  mockPublishTrip,
  mockTransitionTrip,
  mockUpdateTrip,
} from "@/mocks/trips";
import { createApiError } from "@/mocks/scenarios";
import { jsonResult, statusForCode, validationError } from "./api-response";
import { readSessionId } from "./session-cookie";

function requireSession(request: Request) {
  return readSessionId(request.headers.get("cookie"));
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function handleCreateTripRequest(request: Request): Promise<Response> {
  const sessionId = requireSession(request);
  if (!sessionId) {
    return jsonResult(
      createApiError("UNAUTHORIZED", "Tidak sah"),
      statusForCode("UNAUTHORIZED"),
    );
  }
  const parsed = createTripSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  const key = request.headers.get("idempotency-key") ?? undefined;
  const mock = mockCreateTrip("success", parsed.data, key);
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleListMyTripsRequest(request: Request): Promise<Response> {
  const sessionId = requireSession(request);
  if (!sessionId) {
    return jsonResult(
      createApiError("UNAUTHORIZED", "Tidak sah"),
      statusForCode("UNAUTHORIZED"),
    );
  }
  const role = (new URL(request.url).searchParams.get("role") ??
    "hosted") as MyTripRole;
  const mock = mockListMyTrips("success", role);
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleGetTripRequest(
  request: Request,
  tripId: string,
): Promise<Response> {
  const sessionId = requireSession(request);
  const mock = mockGetTrip("success", tripId, { guest: !sessionId });
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleUpdateTripRequest(
  request: Request,
  tripId: string,
): Promise<Response> {
  const sessionId = requireSession(request);
  if (!sessionId) {
    return jsonResult(
      createApiError("UNAUTHORIZED", "Tidak sah"),
      statusForCode("UNAUTHORIZED"),
    );
  }
  const parsed = updateTripSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  const mock = mockUpdateTrip(tripId, parsed.data);
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleDeleteTripRequest(request: Request): Promise<Response> {
  const sessionId = requireSession(request);
  if (!sessionId) return jsonResult(createApiError("UNAUTHORIZED", "Tidak sah"), statusForCode("UNAUTHORIZED"));
  return jsonResult({ success: true, data: { deleted: true } }, 200);
}

export async function handlePublishTripRequest(
  request: Request,
  tripId: string,
): Promise<Response> {
  const sessionId = requireSession(request);
  if (!sessionId) {
    return jsonResult(
      createApiError("UNAUTHORIZED", "Tidak sah"),
      statusForCode("UNAUTHORIZED"),
    );
  }
  const parsed = publishTripSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  if (sessionId === "pending") {
    const mock = mockPublishTrip("validationError", tripId);
    if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  }
  const mock = mockPublishTrip("success", tripId);
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleLeaveTripRequest(
  request: Request,
  tripId: string,
): Promise<Response> {
  const sessionId = requireSession(request);
  if (!sessionId) {
    return jsonResult(
      createApiError("UNAUTHORIZED", "Tidak sah"),
      statusForCode("UNAUTHORIZED"),
    );
  }
  const body = (await readBody(request)) as { confirmLeave?: boolean };
  const mock = mockLeaveTrip("success", tripId, Boolean(body.confirmLeave));
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleTransitionTripRequest(
  request: Request,
  tripId: string,
): Promise<Response> {
  const sessionId = requireSession(request);
  if (!sessionId) {
    return jsonResult(
      createApiError("UNAUTHORIZED", "Tidak sah"),
      statusForCode("UNAUTHORIZED"),
    );
  }
  const body = (await readBody(request)) as { action?: string };
  const action = body.action;
  if (
    action !== "close" &&
    action !== "cancel" &&
    action !== "start" &&
    action !== "complete" &&
    action !== "reopen"
  ) {
    return jsonResult(
      createApiError("INVALID_TRANSITION", "Aksi status tidak valid"),
      400,
    );
  }
  const mock = mockTransitionTrip(tripId, action);
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

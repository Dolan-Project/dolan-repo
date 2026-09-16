import {
  API_V1_PREFIX,
  EXPRESS_PATHS,
  createTripSchema,
  publishTripSchema,
  tripLeavePath,
  tripPath,
  tripPublishPath,
  updateTripSchema,
  type ApiError,
  type TripDetail,
} from "@/lib/contracts";
import { jsonResult, validationError } from "./api-response";
import { proxyToExpress } from "./express-proxy";
import {
  aliasTripDetail,
  createTripBodyFromInput,
  hostTransitionPath,
  publishBodyFromUi,
  updateTripBodyFromInput,
} from "./trip-map";
import { createApiError } from "@/mocks/scenarios";

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function mapTripDetailResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return response;
  let payload: { success?: boolean; data?: TripDetail };
  try {
    payload = (await response.json()) as { success?: boolean; data?: TripDetail };
  } catch {
    return jsonResult(
      createApiError("PROVIDER_UNAVAILABLE", "Layanan trip tidak tersedia"),
      503,
    );
  }
  if (!payload.success || !payload.data) {
    return jsonResult(payload as ApiError, response.status);
  }
  return jsonResult(
    { success: true, data: aliasTripDetail(payload.data) },
    response.status,
  );
}

export async function proxyCreateTrip(request: Request): Promise<Response> {
  const parsed = createTripSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  return mapTripDetailResponse(
    await proxyToExpress(request, `${API_V1_PREFIX}${EXPRESS_PATHS.trips}`, {
      method: "POST",
      json: await createTripBodyFromInput(parsed.data),
    }),
  );
}

export async function proxyListMyTrips(request: Request): Promise<Response> {
  return proxyToExpress(request, `${API_V1_PREFIX}${EXPRESS_PATHS.tripsMe}`, {
    method: "GET",
  });
}

export async function proxyGetTrip(
  request: Request,
  tripId: string,
): Promise<Response> {
  return mapTripDetailResponse(
    await proxyToExpress(request, `${API_V1_PREFIX}${tripPath(tripId)}`, {
      method: "GET",
    }),
  );
}

export async function proxyUpdateTrip(
  request: Request,
  tripId: string,
): Promise<Response> {
  const parsed = updateTripSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  return mapTripDetailResponse(
    await proxyToExpress(request, `${API_V1_PREFIX}${tripPath(tripId)}`, {
      method: "PATCH",
      json: await updateTripBodyFromInput(parsed.data),
    }),
  );
}

export async function proxyDeleteTrip(request: Request, tripId: string): Promise<Response> {
  return proxyToExpress(request, `${API_V1_PREFIX}${tripPath(tripId)}`, { method: "DELETE" });
}

export async function proxyPublishTrip(
  request: Request,
  tripId: string,
): Promise<Response> {
  const parsed = publishTripSchema.safeParse(await readBody(request));
  if (!parsed.success) return validationError(parsed.error);
  return mapTripDetailResponse(
    await proxyToExpress(request, `${API_V1_PREFIX}${tripPublishPath(tripId)}`, {
      method: "POST",
      json: publishBodyFromUi(parsed.data),
    }),
  );
}

export async function proxyLeaveTrip(
  request: Request,
  tripId: string,
): Promise<Response> {
  await readBody(request);
  return mapTripDetailResponse(
    await proxyToExpress(request, `${API_V1_PREFIX}${tripLeavePath(tripId)}`, {
      method: "POST",
      json: {},
    }),
  );
}

export async function proxyTransitionTrip(
  request: Request,
  tripId: string,
): Promise<Response> {
  const body = (await readBody(request)) as { action?: string };
  const path = hostTransitionPath(tripId, body.action ?? "");
  if (!path) {
    return jsonResult(
      createApiError("INVALID_TRANSITION", "Aksi status tidak valid"),
      400,
    );
  }
  return mapTripDetailResponse(
    await proxyToExpress(request, path, { method: "POST", json: {} }),
  );
}

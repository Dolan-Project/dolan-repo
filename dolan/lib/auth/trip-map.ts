import {
  API_V1_PREFIX,
  tripCancelPath,
  tripClosePath,
  tripCompletePath,
  tripReopenPath,
  tripStartPath,
  type CreateTripInput,
  type PublishTripInput,
  type TripDetail,
} from "@dolan/shared";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { meetingPointFor, resolveGeoPlace } from "@/mocks/geo";

function moneyString(amount: number): string {
  return String(Math.round(amount));
}

type ResolvedPoint = { latitude: number; longitude: number };

async function resolveLivePlace(query: string): Promise<ResolvedPoint | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? process.env.EXPRESS_ORIGIN ?? "http://localhost:4000/api/v1")
    .replace(/\/$/, "")
    .replace(/\/api\/v1$/, "");
  const url = `${base}/api/v1/search/places?${new URLSearchParams({ q: trimmed, page: "1", limit: "1" })}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      success?: boolean;
      data?: Array<{ latitude?: number; longitude?: number }>;
    };
    const first = payload.success ? payload.data?.[0] : null;
    if (!first || !Number.isFinite(first.latitude) || !Number.isFinite(first.longitude)) return null;
    return { latitude: Number(first.latitude), longitude: Number(first.longitude) };
  } catch {
    return null;
  }
}

async function locationFields(input: CreateTripInput) {
  if (shouldUseMockApi()) {
    const origin = resolveGeoPlace(input.origin);
    const meeting = meetingPointFor(input.meetingPoint, input.destinationCity);
    return {
      originLabel: input.origin,
      originLatitude: origin?.latitude,
      originLongitude: origin?.longitude,
      destinationCity: input.destinationCity || undefined,
      transportMode: input.transport,
      publicMeetingPointLabel: input.meetingPoint || undefined,
      publicMeetingPointLatitude: meeting?.latitude,
      publicMeetingPointLongitude: meeting?.longitude,
    };
  }

  const [origin, meeting] = await Promise.all([
    resolveLivePlace(input.origin),
    resolveLivePlace(input.meetingPoint || input.destinationCity),
  ]);

  return {
    originLabel: input.origin,
    originLatitude: origin?.latitude,
    originLongitude: origin?.longitude,
    destinationCity: input.destinationCity || undefined,
    transportMode: input.transport,
    publicMeetingPointLabel: input.meetingPoint || undefined,
    publicMeetingPointLatitude: meeting?.latitude,
    publicMeetingPointLongitude: meeting?.longitude,
  };
}

export async function createTripBodyFromInput(input: CreateTripInput) {
  return {
    title: input.title,
    description: input.description || undefined,
    visibility: input.visibility,
    startDate: input.startDate,
    endDate: input.endDate,
    timezone: "Asia/Jakarta",
    planningPartySize: input.planningPartySize,
    budgetAmount: moneyString(input.budgetAmount),
    budgetBasis: input.budgetBasis,
    maxParticipants: input.maxParticipants,
    genderRule: input.genderRule,
    communityRules: input.communityRules || undefined,
    preferences: {
      path: input.path,
      activityPrefs: input.activityPrefs,
      lodgingPref: input.lodgingPref,
      companionNote: input.companionNote,
      pace: input.pace,
      accessibilityNeeds: input.accessibilityNeeds,
      genderRule: input.genderRule,
      communityRules: input.communityRules,
      privateInvite: input.privateInvite,
      regenerateMode: input.regenerateMode,
      coverPlace: input.coverPlace ?? undefined,
    },
    ...(await locationFields(input)),
  };
}

export async function updateTripBodyFromInput(input: CreateTripInput) {
  const location = await locationFields(input);
  return {
    title: input.title,
    description: input.description ?? "",
    startDate: input.startDate,
    endDate: input.endDate,
    planningPartySize: input.planningPartySize,
    budgetAmount: moneyString(input.budgetAmount),
    budgetBasis: input.budgetBasis,
    maxParticipants: input.maxParticipants ?? null,
    genderRule: input.genderRule,
    communityRules: input.communityRules || null,
    publicMeetingPointLabel: location.publicMeetingPointLabel ?? null,
    publicMeetingPointLatitude: location.publicMeetingPointLatitude ?? null,
    publicMeetingPointLongitude: location.publicMeetingPointLongitude ?? null,
    originLabel: location.originLabel,
    originLatitude: location.originLatitude ?? null,
    originLongitude: location.originLongitude ?? null,
    destinationCity: input.destinationCity || null,
    transportMode: location.transportMode,
    preferences: {
      path: input.path,
      activityPrefs: input.activityPrefs,
      lodgingPref: input.lodgingPref,
      companionNote: input.companionNote,
      pace: input.pace,
      accessibilityNeeds: input.accessibilityNeeds,
      genderRule: input.genderRule,
      communityRules: input.communityRules,
      privateInvite: input.privateInvite,
      regenerateMode: input.regenerateMode,
      coverPlace: input.coverPlace ?? undefined,
    },
  };
}

export function publishBodyFromUi(input: PublishTripInput) {
  return { visibility: input.visibility };
}

export function hostTransitionPath(tripId: string, action: string): string | null {
  const suffix =
    action === "close"
      ? tripClosePath(tripId)
      : action === "reopen"
        ? tripReopenPath(tripId)
        : action === "start"
          ? tripStartPath(tripId)
          : action === "complete"
            ? tripCompletePath(tripId)
            : action === "cancel"
              ? tripCancelPath(tripId)
              : null;
  return suffix ? `${API_V1_PREFIX}${suffix}` : null;
}

export function aliasTripDetail(trip: TripDetail): TripDetail {
  return {
    ...trip,
    origin: trip.origin ?? trip.privateOriginLabel ?? undefined,
    meetingPoint: trip.meetingPoint ?? trip.publicMeetingPointLabel,
    transport: trip.transport ?? trip.transportMode ?? undefined,
  };
}

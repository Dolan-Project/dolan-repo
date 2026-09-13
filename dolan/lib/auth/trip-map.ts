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
import { meetingPointFor, resolveGeoPlace } from "@/mocks/geo";

function moneyString(amount: number): string {
  return String(Math.round(amount));
}

function locationFields(input: CreateTripInput) {
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

export function createTripBodyFromInput(input: CreateTripInput) {
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
    preferences: {
      path: input.path,
      activityPrefs: input.activityPrefs,
      lodgingPref: input.lodgingPref,
      companionNote: input.companionNote,
    },
    ...locationFields(input),
  };
}

export function updateTripBodyFromInput(input: CreateTripInput) {
  const location = locationFields(input);
  return {
    title: input.title,
    description: input.description ?? "",
    startDate: input.startDate,
    endDate: input.endDate,
    planningPartySize: input.planningPartySize,
    budgetAmount: moneyString(input.budgetAmount),
    budgetBasis: input.budgetBasis,
    maxParticipants: input.maxParticipants ?? null,
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

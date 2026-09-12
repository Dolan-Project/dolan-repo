import type { PlaceSummary } from "@dolan/shared";

const LODGING_TYPES = new Set([
  "lodging",
  "hotel",
  "motel",
  "hostel",
  "guest_house",
  "resort_hotel",
  "bed_and_breakfast",
]);
const FOOD_TYPES = new Set(["restaurant", "cafe", "bar", "bakery", "meal_takeaway", "food"]);
const DESTINATION_TYPES = new Set([
  "tourist_attraction",
  "natural_feature",
  "park",
  "museum",
  "art_gallery",
  "hindu_temple",
  "place_of_worship",
  "mosque",
  "church",
  "zoo",
  "aquarium",
  "amusement_park",
  "campground",
  "historical_landmark",
  "point_of_interest",
]);

const LODGING_QUERY = /\b(hotel|penginapan|hostel|motel|villa|resort|resto|restoran|cafe|kafe|makan)\b/i;

export function looksLikeLodgingOrFoodQuery(query: string) {
  return LODGING_QUERY.test(query);
}

export function destinationScore(place: PlaceSummary) {
  const types = place.types ?? [];
  if (types.some((type) => LODGING_TYPES.has(type))) return -3;
  if (types.some((type) => FOOD_TYPES.has(type))) return -2;
  if (types.some((type) => DESTINATION_TYPES.has(type))) return 2;
  return 0;
}

export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

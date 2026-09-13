export function isChosenItineraryPath(path: string) {
  if (path.startsWith("/itinerary/")) return true;
  return /^\/trip-saya\/[^/]+\/itinerary\/?$/.test(path);
}

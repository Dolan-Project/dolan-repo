export const ITINERARY_ROUTE_COLOR = "#004ac6";
export const ITINERARY_STOP_COLORS = ["#004ac6", "#ef3b69", "#fe893c", "#0ea5e9", "#7c3aed", "#16a34a"] as const;

export function itineraryStopColor(indexZeroBased: number) {
  return ITINERARY_STOP_COLORS[indexZeroBased % ITINERARY_STOP_COLORS.length]!;
}

export function itineraryStopBadgeStyle(indexZeroBased: number) {
  const backgroundColor = itineraryStopColor(indexZeroBased);
  return {
    backgroundColor,
    borderColor: backgroundColor,
    color: "#ffffff",
  };
}

export function itineraryCircleSvg(indexZeroBased: number, sequence: number, selected = false) {
  const color = itineraryStopColor(indexZeroBased);
  const ring = selected ? "#ffffff" : color;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="${color}" stroke="${ring}" stroke-width="${selected ? 3 : 2}"/><text x="16" y="21" text-anchor="middle" font-size="13" font-weight="800" font-family="Arial,sans-serif" fill="#ffffff">${sequence}</text></svg>`;
}

export function itineraryPinSvg(indexZeroBased: number, sequence: number, selected = false) {
  const color = itineraryStopColor(indexZeroBased);
  const stroke = "#ffffff";
  const strokeWidth = selected ? 3 : 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><filter id="s" x="-35%" y="-20%" width="170%" height="170%"><feDropShadow dx="0" dy="2" stdDeviation="1.8" flood-opacity=".28"/></filter><path filter="url(#s)" d="M16 1.5C8.27 1.5 2 7.77 2 15.5 2 26.1 16 40 16 40s14-13.9 14-24.5c0-7.73-6.27-14-14-14Z" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}"/><circle cx="16" cy="15.2" r="8" fill="white"/><text x="16" y="19.6" text-anchor="middle" font-size="11" font-weight="800" font-family="Arial,sans-serif" fill="${color}">${sequence}</text></svg>`;
}

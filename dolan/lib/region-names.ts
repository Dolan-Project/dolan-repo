import { PROVINCE_CENTERS } from "@/lib/template-itinerary";

export function isAdministrativeRegionName(input: string) {
  const value = input.trim().toLocaleLowerCase("id-ID");
  if (!value) return false;
  return Object.keys(PROVINCE_CENTERS).some((name) => name.toLocaleLowerCase("id-ID") === value);
}

export function administrativeRegionHub(input: string) {
  const value = input.trim().toLocaleLowerCase("id-ID");
  const match = Object.entries(PROVINCE_CENTERS).find(([name]) => name.toLocaleLowerCase("id-ID") === value);
  return match?.[1] ?? null;
}

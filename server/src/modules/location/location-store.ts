export type LocationShareRecord = {
  id: string;
  userId: string;
  tripId: string;
  scope: "TRIP_PRECISE" | "PUBLIC_APPROXIMATE";
  expiresAt: Date;
  revokedAt: Date | null;
  latest: { latitude: number; longitude: number; recordedAt: Date } | null;
};

export interface LocationStore {
  findActive(tripId: string, userId: string, now?: Date): Promise<LocationShareRecord | null>;
  create(share: Omit<LocationShareRecord, "latest">): Promise<LocationShareRecord>;
  update(id: string, patch: Partial<Pick<LocationShareRecord, "expiresAt" | "scope" | "revokedAt">>): Promise<LocationShareRecord>;
  setLatest(
    id: string,
    latest: { latitude: number; longitude: number; recordedAt: Date } | null,
  ): Promise<void>;
  listForTrip(tripId: string): Promise<LocationShareRecord[]>;
}

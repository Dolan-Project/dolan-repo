import { isShareActive } from "./location-privacy.ts";
import type { LocationShareRecord, LocationStore } from "./location-store.ts";

export class MemoryLocationStore implements LocationStore {
  readonly shares: LocationShareRecord[] = [];

  async findActive(tripId: string, userId: string, now = new Date()) {
    return (
      this.shares.find(
        (share) => share.tripId === tripId && share.userId === userId && isShareActive(share, now),
      ) ?? null
    );
  }

  async create(share: Omit<LocationShareRecord, "latest">) {
    const record = { ...share, latest: null };
    this.shares.push(record);
    return record;
  }

  async update(id: string, patch: Partial<Pick<LocationShareRecord, "expiresAt" | "scope" | "revokedAt">>) {
    const share = this.shares.find((item) => item.id === id);
    if (!share) throw new Error("SHARE_NOT_FOUND");
    Object.assign(share, patch);
    return share;
  }

  async setLatest(id: string, latest: LocationShareRecord["latest"]) {
    const share = this.shares.find((item) => item.id === id);
    if (share) share.latest = latest;
  }

  async listForTrip(tripId: string) {
    return this.shares.filter((share) => share.tripId === tripId);
  }
}

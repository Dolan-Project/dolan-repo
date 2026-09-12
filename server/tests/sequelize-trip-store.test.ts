import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Sequelize } from "sequelize";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const databaseDir = path.join(repoRoot, "server", ".tmp-pg-trip");
const port = 55433;
const databaseUrl = `postgres://postgres:postgres@127.0.0.1:${port}/dolan`;
const hostUserId = "11111111-1111-4111-8111-111111111111";

let pg: { stop: () => Promise<void> } | null = null;
let sequelize: Sequelize | null = null;
let skipReason = "";

describe("Sequelize trip store", () => {
  beforeAll(async () => {
    try {
      const { default: EmbeddedPostgres } = await import("embedded-postgres");
      await rm(databaseDir, { recursive: true, force: true });
      await mkdir(path.dirname(databaseDir), { recursive: true });
      const instance = new EmbeddedPostgres({
        databaseDir,
        user: "postgres",
        password: "postgres",
        port,
        persistent: false,
      });
      await instance.initialise();
      await instance.start();
      await instance.createDatabase("dolan");
      pg = instance;

      process.env.DATABASE_URL = databaseUrl;
      const sequelizeCli = path.join(repoRoot, "node_modules", "sequelize-cli", "lib", "sequelize");
      await execFileAsync(process.execPath, [sequelizeCli, "db:migrate"], {
        cwd: repoRoot,
        env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "development" },
        maxBuffer: 10 * 1024 * 1024,
      });

      const { replaceSequelizeForTests, resetInitModelsForTests } = await import("@dolan/database");
      sequelize = new Sequelize(databaseUrl, {
        dialect: "postgres",
        logging: false,
        define: { underscored: true, timestamps: true },
      });
      replaceSequelizeForTests(sequelize);
      resetInitModelsForTests();
    } catch (error) {
      skipReason = error instanceof Error ? error.message : String(error);
      if (pg) await pg.stop().catch(() => undefined);
      pg = null;
    }
  }, 120_000);

  afterAll(async () => {
    const { replaceSequelizeForTests } = await import("@dolan/database").catch(() => ({
      replaceSequelizeForTests: () => undefined,
    }));
    await sequelize?.close().catch(() => undefined);
    replaceSequelizeForTests(null);
    if (pg) await pg.stop().catch(() => undefined);
    await rm(databaseDir, { recursive: true, force: true });
  }, 30_000);

  it("locks a trip row and deletes template-copied drafts without FK errors", async () => {
    if (skipReason) throw new Error(`Postgres test helper unavailable: ${skipReason}`);

    const { ItineraryDay, ItineraryStop, ItineraryTemplate, ItineraryVersion, Place, TemplateUsage, Trip, User } =
      await import("@dolan/database");
    const { SequelizeTripStore } = await import("../src/modules/trips/sequelize-store.ts");
    const store = new SequelizeTripStore();

    await User.create({
      id: hostUserId,
      authReference: "auth-verified-complete",
      email: "verified@dolan.test",
    });

    const place = await Place.create({
      googlePlaceId: "ChIJ-malioboro",
      cachedName: "Malioboro",
      cachedCity: "Yogyakarta",
      cachedLatitude: -7.79,
      cachedLongitude: 110.36,
    });
    const template = await ItineraryTemplate.create({
      title: "Yogya 3 hari",
      city: "Yogyakarta",
      durationDays: 3,
      usageCount: 1,
    });
    const trip = await store.createTrip({
      hostUserId,
      title: "Salinan template",
      description: null,
      visibility: "PRIVATE",
      status: "DRAFT",
      startDate: null,
      endDate: null,
      timezone: "Asia/Jakarta",
      privateOriginLabel: null,
      privateOriginLatitude: null,
      privateOriginLongitude: null,
      destinationCity: "Yogyakarta",
      publicMeetingPointLabel: null,
      publicMeetingPointLatitude: null,
      publicMeetingPointLongitude: null,
      transportMode: null,
      budgetAmount: null,
      budgetBasis: "PER_PERSON",
      currency: "IDR",
      planningPartySize: 1,
      maxParticipants: null,
      currentItineraryVersionId: null,
      preferences: null,
    });
    await TemplateUsage.create({
      templateId: template.id,
      userId: hostUserId,
      createdTripId: trip.id,
      usedAt: new Date(),
    });
    const version = await ItineraryVersion.create({
      tripId: trip.id,
      versionNumber: 1,
      createdByUserId: hostUserId,
    });
    const day = await ItineraryDay.create({
      itineraryVersionId: version.id,
      dayNumber: 1,
    });
    await ItineraryStop.create({
      itineraryDayId: day.id,
      placeId: place.id,
      sequence: 1,
    });
    await store.updateTrip(trip.id, { currentItineraryVersionId: version.id });

    const cover = await store.getCoverPlace(trip.id);
    expect(cover?.name).toBe("Malioboro");

    let released = false;
    const first = store.withTripLock(trip.id, async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      released = true;
      return "one";
    });
    const second = store.withTripLock(trip.id, async () => {
      expect(released).toBe(true);
      return "two";
    });
    await expect(Promise.all([first, second])).resolves.toEqual(["one", "two"]);

    await store.withTripLock(trip.id, async () => {
      await store.deleteTrip(trip.id);
    });
    await template.reload();
    expect(await Trip.findByPk(trip.id)).toBeNull();
    expect(template.usageCount).toBe(0);
  }, 30_000);

  it("serializes last-seat approvals and records Places quota", async () => {
    if (skipReason) throw new Error(`Postgres test helper unavailable: ${skipReason}`);

    const { User } = await import("@dolan/database");
    const { SequelizeTripStore } = await import("../src/modules/trips/sequelize-store.ts");
    const { TripService } = await import("../src/modules/trips/trip-service.ts");
    const { SequelizeQuotaStore } = await import("../src/modules/search/sequelize-quota.ts");

    const store = new SequelizeTripStore();

    const budiId = "55555555-5555-4555-8555-555555555555";
    const citraId = "44444444-4444-4444-8444-444444444444";
    await User.findOrCreate({
      where: { id: hostUserId },
      defaults: { id: hostUserId, authReference: "auth-verified-complete", email: "verified@dolan.test" },
    });
    await User.findOrCreate({
      where: { id: budiId },
      defaults: { id: budiId, authReference: "auth-verified-budi", email: "budi@dolan.test" },
    });
    await User.findOrCreate({
      where: { id: citraId },
      defaults: { id: citraId, authReference: "auth-admin", email: "admin@dolan.test" },
    });

    const trips = new TripService(store);
    const trip = await store.createTrip({
      hostUserId,
      title: "Last seat",
      description: null,
      visibility: "PUBLIC",
      status: "OPEN",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      timezone: "Asia/Jakarta",
      privateOriginLabel: null,
      privateOriginLatitude: null,
      privateOriginLongitude: null,
      destinationCity: "Yogyakarta",
      publicMeetingPointLabel: "Tugu",
      publicMeetingPointLatitude: null,
      publicMeetingPointLongitude: null,
      transportMode: null,
      budgetAmount: null,
      budgetBasis: "PER_PERSON",
      currency: "IDR",
      planningPartySize: 1,
      maxParticipants: 2,
      currentItineraryVersionId: null,
      preferences: null,
    });
    await store.ensureHostMembership(trip.id, hostUserId);
    const first = await store.createJoin({
      tripId: trip.id,
      userId: budiId,
      message: null,
      status: "PENDING",
      reviewedByUserId: null,
      reviewedAt: null,
    });
    const second = await store.createJoin({
      tripId: trip.id,
      userId: citraId,
      message: null,
      status: "PENDING",
      reviewedByUserId: null,
      reviewedAt: null,
    });

    const hostActor = {
      kind: "user" as const,
      user: {
        id: hostUserId,
        authReference: "auth-verified-complete",
        email: "verified@dolan.test",
        role: "USER" as const,
        status: "ACTIVE" as const,
        emailVerifiedAt: "2026-01-01T00:00:00.000Z",
        username: "alya",
        displayName: "Alya",
        domicile: "Jakarta",
        avatarUrl: null,
        coverUrl: null,
        bio: null,
      },
    };

    const results = await Promise.allSettled([
      trips.reviewJoin(hostActor, first.id, "accept", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      trips.reviewJoin(hostActor, second.id, "accept", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    ]);
    const accepted = results.filter((row) => row.status === "fulfilled").length;
    const rejected = results.filter(
      (row) =>
        row.status === "rejected" &&
        row.reason &&
        typeof row.reason === "object" &&
        "code" in row.reason &&
        row.reason.code === "TRIP_FULL",
    ).length;
    expect(accepted).toBe(1);
    expect(rejected).toBe(1);

    const quota = new SequelizeQuotaStore();
    const counted = await quota.countAndIncrement({
      provider: "google_places",
      operation: "searchText",
      period: "2026-09-13",
      userId: hostUserId,
      limit: 1,
      estimatedCost: 0.01,
    });
    expect(counted).toBe(1);
    const { ApiUsageCounter } = await import("@dolan/database");
    const usage = await ApiUsageCounter.findOne({
      where: { provider: "google_places", operation: "searchText", period: "2026-09-13", userId: hostUserId },
    });
    expect(Number(usage?.estimatedCost)).toBeGreaterThan(0);

    const { SequelizeSocialStore } = await import("../src/modules/social/social-queries.ts");
    const social = new SequelizeSocialStore();
    await social.follow(hostUserId, budiId);
    expect(await social.countFollowers(budiId)).toBe(1);
    await social.block(budiId, hostUserId);
    expect(await social.countFollowers(budiId)).toBe(0);
    await expect(social.follow(hostUserId, hostUserId)).rejects.toMatchObject({ code: "SELF_FOLLOW" });
    await expect(
      quota.countAndIncrement({
        provider: "google_places",
        operation: "searchText",
        period: "2026-09-13",
        userId: hostUserId,
        limit: 1,
      }),
    ).rejects.toMatchObject({ status: 429, code: "QUOTA_EXCEEDED" });
  }, 30_000);
});

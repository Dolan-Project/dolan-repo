import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { MockGeminiAdapter } from "../src/modules/jobs/gemini-adapter.ts";
import { MemoryJobRepository } from "../src/modules/jobs/job-repository.ts";
import { GenerationJobService } from "../src/modules/jobs/job-service.ts";

const keyA = "11111111-1111-4111-8111-111111111111";
const keyB = "22222222-2222-4222-8222-222222222222";

function setup(model: MockGeminiAdapter = new MockGeminiAdapter()) {
  const auth = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
  const jobs = new GenerationJobService(new MemoryJobRepository(), model);
  return { app: createApp(auth, () => 0, jobs), jobs };
}

describe("generation job skeleton", () => {
  it("enqueues a job, survives refresh, and keeps the selected version after success", async () => {
    const { app, jobs } = setup();
    const created = await request(app)
      .post("/api/v1/trips/trip-draft/generate")
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", keyA)
      .send({ type: "GENERATE_ITINERARY" });

    expect(created.status).toBe(202);
    const jobId = created.body.data.id;

    const replay = await request(app)
      .post("/api/v1/trips/trip-draft/generate")
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", keyA)
      .send({ type: "GENERATE_ITINERARY" });
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(jobId);

    await jobs.processNext("worker-test");

    const refreshed = await request(app)
      .get(`/api/v1/generation-jobs/${jobId}`)
      .set("Authorization", "Bearer mock-verified-complete");
    expect(refreshed.body.data.status).toBe("SUCCEEDED");
    expect(refreshed.body.data.selectedVersionId).toBeNull();
    expect(refreshed.body.data.resultVersionId).toBeTruthy();
    expect(jobs.getVersions("trip-draft")).toHaveLength(1);
  });

  it("does not create a second active job and does not drop the draft on failure", async () => {
    const { app, jobs } = setup(
      new MockGeminiAdapter({
        summary: "bad",
        assumptions: [],
        days: [
          {
            dayNumber: 1,
            date: "2026-10-01",
            title: "Hari 1",
            stops: [
              {
                sequence: 1,
                place: { googlePlaceId: "FAKE-PLACE", name: "Tempat karangan", city: "X" },
                customTitle: null,
                activityType: "wisata",
                startTime: null,
                durationMinutes: 60,
                travelDurationMinutes: null,
                notes: null,
                isLocked: false,
              },
            ],
          },
        ],
        budgetItems: [],
      }),
    );

    const first = await request(app)
      .post("/api/v1/trips/trip-draft/generate")
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", keyA)
      .send({});
    expect(first.status).toBe(202);

    const second = await request(app)
      .post("/api/v1/trips/trip-draft/generate")
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", keyB)
      .send({});
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("JOB_ALREADY_ACTIVE");

    const processed = await jobs.processNext("worker-test");
    expect(processed?.status).toBe("FAILED");
    expect(processed?.draftPreserved).toBe(true);
    expect(jobs.getVersions("trip-draft")).toHaveLength(0);
  });

  it("requeues a stale processing job", async () => {
    const repo = new MemoryJobRepository();
    const jobs = new GenerationJobService(repo, new MockGeminiAdapter());
    const created = await repo.createOrGetIdempotent({
      tripId: "trip-draft",
      requestedBy: "11111111-1111-4111-8111-111111111111",
      type: "GENERATE_ITINERARY",
      idempotencyKey: keyA,
      selectedVersionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    const lockedAt = new Date(Date.now() - 10 * 60 * 1000);
    await repo.claimNextQueued("old-worker", lockedAt);

    const recovered = await repo.recoverStale(5 * 60 * 1000, new Date());
    expect(recovered).toBe(1);
    const job = await repo.getById(created.job.id);
    expect(job?.status).toBe("QUEUED");
    expect(job?.selectedVersionId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(jobs.getVersions("trip-draft")).toHaveLength(0);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { tripRouteHandlers } from "./adapter";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const draftBody = {
  path: "known",
  title: "Sailing Komodo 4D3N",
  origin: "Jakarta",
  destinationCity: "Labuan Bajo",
  startDate: "2026-10-24",
  endDate: "2026-10-27",
  transport: "Kapal Phinisi",
  planningPartySize: 4,
  budgetAmount: 2_000_000,
  budgetBasis: "PER_PERSON",
  visibility: "PUBLIC",
  maxParticipants: 7,
  meetingPoint: "Bandara Komodo (LBJ)",
};

describe("tripRouteHandlers live proxy", () => {
  it("keeps typed mocks when mock API is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    const response = await tripRouteHandlers.create(
      new Request("http://localhost/api/v1/trips", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "dolan_session=complete",
        },
        body: JSON.stringify(draftBody),
      }),
    );
    const json = (await response.json()) as {
      success: true;
      data: { status: string };
    };
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("DRAFT");
  });

  it("maps create-trip onto Express when mock API is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "http://localhost:4000");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await tripRouteHandlers.create(
      new Request("http://localhost/api/v1/trips", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "dolan_session=mock-verified-complete",
          "idempotency-key": "11111111-1111-4111-8111-111111111111",
        },
        body: JSON.stringify(draftBody),
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/v1/trips");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer mock-verified-complete");
    expect(headers.get("idempotency-key")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    const body = JSON.parse(String(init.body)) as {
      originLabel: string;
      budgetAmount: string;
      publicMeetingPointLabel: string;
    };
    expect(body.originLabel).toBe("Jakarta");
    expect(body.budgetAmount).toBe("2000000");
    expect(body.publicMeetingPointLabel).toBe("Bandara Komodo (LBJ)");
  });

  it("proxies host close onto Wira close path", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "http://localhost:4000");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await tripRouteHandlers.transition(
      new Request("http://localhost/api/v1/trips/t1/transition", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "dolan_session=token",
        },
        body: JSON.stringify({ action: "close" }),
      }),
      "t1",
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/v1/trips/t1/close");
    expect(init.method).toBe("POST");
  });
});

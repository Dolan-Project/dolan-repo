import type { ApiError, ApiSuccess, ChatMessage } from "@/lib/contracts";
import { samplePublicUser } from "./fixtures";
import { createApiError, type MockScenario } from "./scenarios";

export type ChatActor = "host" | "participant" | "pending" | "guest";

export function mockListMessages(
  scenario: MockScenario,
  actor: ChatActor,
): ApiSuccess<ChatMessage[]> | ApiError {
  if (actor === "pending" || actor === "guest") {
    return createApiError("NOT_MEMBER", "Pending tidak dapat membaca chat");
  }
  if (scenario === "unauthorized") {
    return createApiError("NOT_MEMBER", "Bukan anggota");
  }
  if (scenario === "empty") {
    return { success: true, data: [] };
  }
  return {
    success: true,
    data: [
      {
        id: "m1",
        tripId: "trip_1",
        sender: samplePublicUser,
        clientMessageId: "client_1",
        body: "Halo rombongan",
        sentAt: "2026-09-12T00:00:00.000Z",
      },
    ],
  };
}

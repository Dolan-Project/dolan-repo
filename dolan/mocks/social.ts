import {
  AuthErrorCode,
  TripErrorCode,
  type ApiError,
  type ApiSuccess,
  type ChatMessage,
  type JoinRequest,
  type TripComment,
} from "@/lib/contracts";
import { samplePublicUser } from "./fixtures";
import { createApiError, type MockScenario } from "./scenarios";
import {
  ROOT_COMMENT_ID,
  nextId,
  socialStore,
  type AppNotification,
} from "./social-store";

export function mockRequestJoin(
  scenario: MockScenario,
  input: { tripId: string; applicantId: string; message: string | null },
): ApiSuccess<JoinRequest> | ApiError {
  if (scenario === "quotaError") {
    return createApiError(TripErrorCode.TRIP_FULL, "Trip penuh");
  }
  if (scenario === "unauthorized") {
    return createApiError("UNAUTHORIZED", "Tidak sah");
  }
  const existing = socialStore().joins.find(
    (row) =>
      row.tripId === input.tripId &&
      row.applicant.id === input.applicantId &&
      (row.status === "PENDING" || row.status === "ACCEPTED"),
  );
  if (existing) {
    return createApiError(TripErrorCode.DUPLICATE_REQUEST, "Pengajuan sudah ada");
  }
  const row: JoinRequest = {
    id: nextId("join"),
    tripId: input.tripId,
    applicant: samplePublicUser,
    message: input.message,
    status: "PENDING",
  };
  socialStore().joins.push(row);
  return { success: true, data: row };
}

export function mockReviewJoin(
  requestId: string,
  decision: "accept" | "reject",
): ApiSuccess<JoinRequest> | ApiError {
  const row = socialStore().joins.find((item) => item.id === requestId);
  if (!row) return createApiError("NOT_FOUND", "Pengajuan tidak ditemukan");
  row.status = decision === "accept" ? "ACCEPTED" : "REJECTED";
  return { success: true, data: row };
}

export function mockWithdrawJoin(
  requestId: string,
  applicantId: string,
): ApiSuccess<JoinRequest> | ApiError {
  const row = socialStore().joins.find((item) => item.id === requestId);
  if (!row || row.applicant.id !== applicantId) {
    return createApiError("NOT_FOUND", "Pengajuan tidak ditemukan");
  }
  row.status = "WITHDRAWN";
  return { success: true, data: row };
}

export function mockListComments(
  scenario: MockScenario,
  tripId: string,
): ApiSuccess<TripComment[]> | ApiError {
  if (scenario === "empty") return { success: true, data: [] };
  return {
    success: true,
    data: socialStore().comments.filter((row) => row.tripId === tripId),
  };
}

export function mockCreateComment(input: {
  tripId: string;
  body: string;
  parentId: string | null;
}): ApiSuccess<TripComment> | ApiError {
  if (input.parentId) {
    const parent = socialStore().comments.find((row) => row.id === input.parentId);
    if (!parent || parent.parentId) {
      return createApiError(TripErrorCode.INVALID_PARENT, "Reply hanya satu tingkat");
    }
  }
  const row: TripComment = {
    id: crypto.randomUUID(),
    tripId: input.tripId,
    author: samplePublicUser,
    parentId: input.parentId,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  socialStore().comments.push(row);
  return { success: true, data: row };
}

export function mockListMessages(
  scenario: MockScenario,
  actor: "host" | "participant" | "pending" | "guest",
  tripId: string,
): ApiSuccess<ChatMessage[]> | ApiError {
  if (actor === "pending" || actor === "guest") {
    return createApiError(AuthErrorCode.NOT_MEMBER, "Pending tidak dapat membaca chat");
  }
  if (scenario === "unauthorized") {
    return createApiError(AuthErrorCode.NOT_MEMBER, "Bukan anggota");
  }
  if (scenario === "providerError") {
    return createApiError("PROVIDER_UNAVAILABLE", "Chat terputus, menyambungkan ulang");
  }
  if (scenario === "empty") return { success: true, data: [] };
  return {
    success: true,
    data: socialStore().messages.filter((row) => row.tripId === tripId),
  };
}

export function mockSendMessage(input: {
  tripId: string;
  body: string;
  clientMessageId: string;
  sender: typeof samplePublicUser;
}): ApiSuccess<ChatMessage> | ApiError {
  const duplicate = socialStore().messages.find(
    (row) => row.clientMessageId === input.clientMessageId,
  );
  if (duplicate) return { success: true, data: duplicate };
  const row: ChatMessage = {
    id: crypto.randomUUID(),
    tripId: input.tripId,
    sender: input.sender,
    clientMessageId: input.clientMessageId,
    body: input.body,
    sentAt: new Date().toISOString(),
  };
  socialStore().messages.push(row);
  return { success: true, data: row };
}

export function mockListNotifications(
  userId: string,
): ApiSuccess<{ items: AppNotification[]; unreadCount: number }> {
  const items = socialStore().notifications.filter((row) => row.recipientUserId === userId);
  return {
    success: true,
    data: {
      items,
      unreadCount: items.filter((row) => row.readAt === null).length,
    },
  };
}

export function mockMarkNotificationRead(
  userId: string,
  id: string,
): ApiSuccess<AppNotification> | ApiError {
  const row = socialStore().notifications.find(
    (item) => item.id === id && item.recipientUserId === userId,
  );
  if (!row) return createApiError("NOT_FOUND", "Notifikasi tidak ditemukan");
  row.readAt = new Date().toISOString();
  return { success: true, data: row };
}

export { ROOT_COMMENT_ID };

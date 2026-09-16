import type { ChatService } from "./chat-service.ts";
import type { MemoryChatStore } from "./memory-chat-store.ts";
import type { TripRealtime } from "../trips/trip-service.ts";

export function tripChatBridge(store: MemoryChatStore, chat: ChatService): TripRealtime {
  return {
    evictFromRoom(tripId, userId) {
      store.evict(tripId, userId);
      return chat.evictFromRoom(tripId, userId);
    },
    onPublished(tripId, hostUserId) {
      if (!store.trips.has(tripId)) store.seedTrip({ tripId, hostUserId });
    },
    onJoinRequested(tripId, userId, join) {
      store.addPending(tripId, userId);
      return chat.onJoinRequested(tripId, userId, join);
    },
    onJoinReviewed(tripId, userId, join, decision) {
      return chat.onJoinReviewed(tripId, userId, join, decision);
    },
    onMemberJoined(tripId, userId) {
      store.addParticipant(tripId, userId);
    },
    onJoinClosed(tripId, userId) {
      store.clearPending(tripId, userId);
      return chat.onJoinClosed(tripId, userId);
    },
    onCancelled(tripId) {
      store.setReadOnly(tripId, true);
    },
    onTripDeleted(tripId, hostUserId, reason) {
      return chat.announceTripDeleted(tripId, hostUserId, reason);
    },
    onNotificationCreated(userId, payload) {
      return chat.onNotificationCreated(userId, payload);
    },
  };
}

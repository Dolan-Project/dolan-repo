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
    onJoinRequested(tripId, userId) {
      store.addPending(tripId, userId);
    },
    onMemberJoined(tripId, userId) {
      store.addParticipant(tripId, userId);
    },
    onJoinClosed(tripId, userId) {
      store.clearPending(tripId, userId);
    },
    onCancelled(tripId) {
      store.setReadOnly(tripId, true);
    },
  };
}

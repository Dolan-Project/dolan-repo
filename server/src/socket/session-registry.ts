import type { Socket } from "socket.io";

export class SocketSessionRegistry {
  private readonly socketsByUser = new Map<string, Set<string>>();
  private readonly usersBySocket = new Map<string, string>();

  register(userId: string, socket: Socket) {
    const bucket = this.socketsByUser.get(userId) ?? new Set<string>();
    bucket.add(socket.id);
    this.socketsByUser.set(userId, bucket);
    this.usersBySocket.set(socket.id, userId);
  }

  forget(socketId: string) {
    const userId = this.usersBySocket.get(socketId);
    if (!userId) return;
    this.usersBySocket.delete(socketId);
    const bucket = this.socketsByUser.get(userId);
    if (!bucket) return;
    bucket.delete(socketId);
    if (bucket.size === 0) this.socketsByUser.delete(userId);
  }

  hasUser(userId: string): boolean {
    return (this.socketsByUser.get(userId)?.size ?? 0) > 0;
  }

  socketIds(userId: string): string[] {
    return [...(this.socketsByUser.get(userId) ?? [])];
  }

  disconnectUser(userId: string, disconnect: (socketId: string) => void) {
    const bucket = this.socketsByUser.get(userId);
    if (!bucket) return 0;
    const socketIds = [...bucket];
    for (const socketId of socketIds) {
      disconnect(socketId);
      this.usersBySocket.delete(socketId);
    }
    this.socketsByUser.delete(userId);
    return socketIds.length;
  }
}

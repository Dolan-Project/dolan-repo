import { describe, expect, it } from "vitest";
import { isUuid } from "../src/lib/is-uuid.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";

describe("resolveUser", () => {
  it("resolves a username without querying findById as a uuid", async () => {
    const users = new MemoryUserRepository();
    const original = users.findById.bind(users);
    users.findById = async (userId: string) => {
      if (!isUuid(userId)) throw new Error(`invalid input syntax for type uuid: "${userId}"`);
      return original(userId);
    };
    const auth = new AuthService(new MockAuthAdapter(), users);
    const user = await auth.resolveUser("budi");
    expect(user.username).toBe("budi");
    expect(user.id).toBe("55555555-5555-4555-8555-555555555555");
  });

  it("still resolves a user id", async () => {
    const auth = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
    const user = await auth.resolveUser("11111111-1111-4111-8111-111111111111");
    expect(user.username).toBe("alya");
  });

  it("returns not found for an unknown username", async () => {
    const auth = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
    await expect(auth.resolveUser("fatwawiratama7")).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});

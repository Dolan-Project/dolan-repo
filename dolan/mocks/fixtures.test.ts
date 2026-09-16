import { describe, expect, it } from "vitest";
import { sampleAuthSession, samplePublicUser } from "./fixtures";

describe("mock fixtures", () => {
  it("does not include email, password, or tokens on public user", () => {
    const user = samplePublicUser;
    expect("email" in user).toBe(false);
    expect("password" in user).toBe(false);
    expect("accessToken" in user).toBe(false);
  });

  it("builds AuthSession with profileComplete from user fields", () => {
    const session = sampleAuthSession;
    expect(session.user.id).toBe(samplePublicUser.id);
    expect(session.emailVerified).toBe(true);
    expect(session.profileComplete).toBe(true);
  });
});

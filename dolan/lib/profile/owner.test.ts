import { describe, expect, it } from "vitest";
import { isOwnProfile, profilePrimaryAction } from "./owner";

describe("isOwnProfile", () => {
  it("is true when usernames match", () => {
    expect(isOwnProfile("salsa", "salsa")).toBe(true);
  });

  it("is false for another traveler or a guest", () => {
    expect(isOwnProfile("salsa", "wayan")).toBe(false);
    expect(isOwnProfile(undefined, "salsa")).toBe(false);
  });
});

describe("profilePrimaryAction", () => {
  it("returns edit for the owner and follow for others", () => {
    expect(profilePrimaryAction("salsa", "salsa")).toBe("edit");
    expect(profilePrimaryAction("salsa", "wayan")).toBe("follow");
    expect(profilePrimaryAction(undefined, "salsa")).toBe("follow");
  });
});

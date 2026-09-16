import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodFields } from "../src/lib/zod-fields.ts";

describe("zodFields", () => {
  it("maps the first issue per path", () => {
    const error = z.object({ name: z.string().min(2) }).safeParse({ name: "x" }).error!;
    expect(zodFields(error).name).toBeTruthy();
    const form = z.string().safeParse(1).error!;
    expect(zodFields(form).value).toBeTruthy();
  });
});

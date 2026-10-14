import { describe, expect, it } from "vitest";
import { authorizeCron } from "../cron-auth";

const SECRET = "s3cret-token-value";

function request(authorization?: string): Request {
  return new Request("https://compare.example/api/prices/cron", {
    headers: authorization === undefined ? {} : { authorization },
  });
}

describe("authorizeCron with CRON_SECRET set", () => {
  const env = { CRON_SECRET: SECRET, NODE_ENV: "production" };

  it.each([`Bearer ${SECRET}`, `bearer ${SECRET}`, `Bearer   ${SECRET}`])("accepts %j", (header) => {
    expect(authorizeCron(request(header), env)).toEqual({ ok: true });
  });

  it.each([
    ["no header", undefined],
    ["an empty header", ""],
    ["a bare scheme", "Bearer"],
    ["a wrong token of the same length", `Bearer ${"x".repeat(SECRET.length)}`],
    ["a prefix of the secret", `Bearer ${SECRET.slice(0, -1)}`],
    ["the secret plus extra characters", `Bearer ${SECRET}x`],
    ["the raw secret without a scheme", SECRET],
    ["another scheme", `Basic ${SECRET}`],
  ])("rejects %s with 401", (_label, header) => {
    expect(authorizeCron(request(header), env)).toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });

  it("requires the secret in development too", () => {
    expect(authorizeCron(request(), { CRON_SECRET: SECRET, NODE_ENV: "development" })).toMatchObject({ status: 401 });
  });

  it("ignores surrounding whitespace in the configured secret", () => {
    expect(authorizeCron(request(`Bearer ${SECRET}`), { CRON_SECRET: ` ${SECRET}\n` })).toEqual({ ok: true });
  });
});

describe("authorizeCron without CRON_SECRET", () => {
  it.each([{}, { CRON_SECRET: "" }, { CRON_SECRET: "  " }])("fails closed in production (%j)", (secretEnv) => {
    expect(authorizeCron(request(`Bearer ${SECRET}`), { ...secretEnv, NODE_ENV: "production" })).toEqual({
      ok: false,
      status: 503,
      error: "CRON_SECRET is not configured",
    });
  });

  it.each(["development", "test", undefined])("allows any request when NODE_ENV is %s", (NODE_ENV) => {
    expect(authorizeCron(request(), { NODE_ENV })).toEqual({ ok: true });
  });
});
